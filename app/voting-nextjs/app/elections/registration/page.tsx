'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey, SystemProgram, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import {
  ElectionStatus,
  parseElectionStatus,
  VoterRegistrationType,
  parseVoterRegistrationType,
  RegistrationStatus,
} from '@/lib/types';
import {
  getElectionStatusLabel,
  getElectionStatusColor,
} from '@/lib/election-utils';
import { getAdminRegistryPda, getVoterRegistrationPda } from '@/lib/helpers';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/shared/AppLayout';
import { VoterSidebar } from '@/components/shared/VoterSidebar';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  UserCheck,
  ArrowRight,
  UserX,
  Shield,
  Plus,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface RegistrationRecord {
  electionPublicKey: string;
  electionTitle: string;
  electionStatus: ElectionStatus;
  registrationStatus: RegistrationStatus;
  registeredAt: number;
}

interface UnregisteredElection {
  publicKey: string;
  title: string;
  electionStatus: ElectionStatus;
}

export default function RegistrationPage() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const program = useProgram();

  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [unregisteredElections, setUnregisteredElections] = useState<UnregisteredElection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-election registration request state
  const [requestingFor, setRequestingFor] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<Record<string, string>>({});
  const [requestSuccess, setRequestSuccess] = useState<Record<string, boolean>>({});

  const fetchRegistrations = async () => {
    if (!program || !publicKey) return;

    try {
      setLoading(true);
      setError('');

      // @ts-ignore
      const electionAccounts = await program.account.election.all();

      const records: RegistrationRecord[] = [];
      const unregistered: UnregisteredElection[] = [];

      for (const electionAccount of electionAccounts) {
        const electionPubkey = electionAccount.publicKey;
        const electionStatus = parseElectionStatus(electionAccount.account.status);
        const regType = parseVoterRegistrationType(electionAccount.account.voterRegistrationType);

        // Only whitelist elections have registrations
        if (regType !== VoterRegistrationType.Whitelist) continue;

        // Skip cancelled elections
        if (electionStatus === ElectionStatus.Cancelled) continue;

        try {
          const [voterRegPda] = getVoterRegistrationPda(
            electionPubkey,
            publicKey,
            program.programId
          );

          // @ts-ignore
          const reg = await program.account.voterRegistration.fetch(voterRegPda);

          let status: RegistrationStatus;
          if (reg.status.pending !== undefined) status = RegistrationStatus.Pending;
          else if (reg.status.approved !== undefined) status = RegistrationStatus.Approved;
          else if (reg.status.rejected !== undefined) status = RegistrationStatus.Rejected;
          else if (reg.status.revoked !== undefined) status = RegistrationStatus.Revoked;
          else status = RegistrationStatus.Pending;

          records.push({
            electionPublicKey: electionPubkey.toString(),
            electionTitle: electionAccount.account.title,
            electionStatus,
            registrationStatus: status,
            registeredAt: reg.registeredAt?.toNumber
              ? reg.registeredAt.toNumber()
              : Number(reg.registeredAt),
          });
        } catch {
          // No registration exists — add to unregistered list if election is still actionable
          if (
            electionStatus === ElectionStatus.Active ||
            electionStatus === ElectionStatus.Draft
          ) {
            unregistered.push({
              publicKey: electionPubkey.toString(),
              title: electionAccount.account.title,
              electionStatus,
            });
          }
        }
      }

      // Sort registrations: Pending first, then by registeredAt desc
      const statusOrder: Record<string, number> = {
        [RegistrationStatus.Pending]: 0,
        [RegistrationStatus.Approved]: 1,
        [RegistrationStatus.Rejected]: 2,
        [RegistrationStatus.Revoked]: 3,
      };
      records.sort((a, b) => {
        const orderDiff = (statusOrder[a.registrationStatus] ?? 99) - (statusOrder[b.registrationStatus] ?? 99);
        if (orderDiff !== 0) return orderDiff;
        return b.registeredAt - a.registeredAt;
      });

      setRegistrations(records);
      setUnregisteredElections(unregistered);
    } catch (err: any) {
      logger.error('Failed to fetch registrations', err);
      setError('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [program, publicKey]);

  const handleRequestRegistration = async (electionPubkeyStr: string) => {
    if (!program || !publicKey) return;

    setRequestingFor(electionPubkeyStr);
    setRequestError((prev) => ({ ...prev, [electionPubkeyStr]: '' }));

    try {
      // Check wallet balance before attempting — new PDA accounts require rent-exemption funding
      const balance = await connection.getBalance(publicKey);
      if (balance < 1_000_000) {
        setRequestError((prev) => ({
          ...prev,
          [electionPubkeyStr]: 'Your wallet has insufficient SOL. On localnet, run: solana airdrop 2 --url http://localhost:8899',
        }));
        setRequestingFor(null);
        return;
      }

      const electionPubkey = new PublicKey(electionPubkeyStr);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [voterRegPda] = getVoterRegistrationPda(
        electionPubkey,
        publicKey,
        program.programId
      );

      // Build transaction explicitly so wallet adapter funds the new PDA properly
      // @ts-ignore
      const registerInstruction = await program.methods
        .requestVoterRegistration()
        .accounts({
          adminRegistry: adminRegistryPda,
          election: electionPubkey,
          voterRegistration: voterRegPda,
          voter: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const { blockhash } = await connection.getLatestBlockhash();
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: publicKey,
      });

      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 })
      );
      transaction.add(registerInstruction);

      const tx = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'finalized',
      });
      await connection.confirmTransaction(tx, 'finalized');

      logger.transaction('registration requested', tx);
      setRequestSuccess((prev) => ({ ...prev, [electionPubkeyStr]: true }));

      // Refresh after a moment
      setTimeout(() => {
        fetchRegistrations();
      }, 1500);
    } catch (err: any) {
      logger.error('Registration request failed', err);
      const msg = err.message?.includes('already in use')
        ? 'You have already requested registration for this election.'
        : err.message || 'Failed to request registration';
      setRequestError((prev) => ({ ...prev, [electionPubkeyStr]: msg }));
    } finally {
      setRequestingFor(null);
    }
  };

  // ──────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────

  const getRegistrationIcon = (status: RegistrationStatus) => {
    switch (status) {
      case RegistrationStatus.Approved:
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case RegistrationStatus.Pending:
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case RegistrationStatus.Rejected:
        return <UserX className="w-5 h-5 text-red-400" />;
      case RegistrationStatus.Revoked:
        return <UserX className="w-5 h-5 text-red-400" />;
      default:
        return <Shield className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRegistrationBadge = (status: RegistrationStatus) => {
    switch (status) {
      case RegistrationStatus.Approved:
        return 'bg-green-500/20 text-green-400';
      case RegistrationStatus.Pending:
        return 'bg-yellow-500/20 text-yellow-400';
      case RegistrationStatus.Rejected:
        return 'bg-red-500/20 text-red-400';
      case RegistrationStatus.Revoked:
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getRegistrationLabel = (status: RegistrationStatus) => {
    switch (status) {
      case RegistrationStatus.Approved:
        return 'Approved';
      case RegistrationStatus.Pending:
        return 'Pending';
      case RegistrationStatus.Rejected:
        return 'Rejected';
      case RegistrationStatus.Revoked:
        return 'Revoked';
      default:
        return 'Unknown';
    }
  };

  // Count by status for summary
  const approvedCount = registrations.filter((r) => r.registrationStatus === RegistrationStatus.Approved).length;
  const pendingCount = registrations.filter((r) => r.registrationStatus === RegistrationStatus.Pending).length;
  const rejectedCount = registrations.filter((r) => r.registrationStatus === RegistrationStatus.Rejected).length;
  const revokedCount = registrations.filter((r) => r.registrationStatus === RegistrationStatus.Revoked).length;

  // ──────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────

  if (!publicKey) {
    return (
      <AppLayout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Wallet Not Connected</h2>
            <p className="text-slate-600 dark:text-gray-400">Please connect your wallet to view your registrations</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sidebar={<VoterSidebar pendingCount={pendingCount} />} showFooter={false}>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Registrations</h1>
          </div>
          <p className="text-slate-600 dark:text-gray-400">
            Track your voter registration status across all whitelist elections
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 dark:bg-gray-800/50 border border-violet-200/50 dark:border-gray-700 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 dark:bg-green-400" />
              <span className="text-slate-600 dark:text-gray-400 text-xs">Approved</span>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{approvedCount}</p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/50 border border-violet-200/50 dark:border-gray-700 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 dark:bg-yellow-400" />
              <span className="text-slate-600 dark:text-gray-400 text-xs">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingCount}</p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/50 border border-violet-200/50 dark:border-gray-700 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 dark:bg-red-400" />
              <span className="text-slate-600 dark:text-gray-400 text-xs">Rejected</span>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{rejectedCount}</p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/50 border border-violet-200/50 dark:border-gray-700 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 dark:bg-red-500" />
              <span className="text-slate-600 dark:text-gray-400 text-xs">Revoked</span>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-500">{revokedCount}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400">{error}</p>
            <Button
              variant="outline"
              className="mt-4 border-slate-300 dark:border-gray-700"
              onClick={fetchRegistrations}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Existing registrations */}
            {registrations.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  Your Registrations
                </h2>
                <div className="space-y-3">
                  {registrations.map((reg) => (
                    <div
                      key={reg.electionPublicKey}
                      className="bg-white/80 dark:bg-gray-800/50 border border-violet-200/50 dark:border-gray-700 rounded-lg overflow-hidden hover:border-violet-300 dark:hover:border-gray-600 transition-all duration-200 shadow-sm"
                    >
                      {/* Status accent line */}
                      <div
                        className={`h-0.5 ${
                          reg.registrationStatus === RegistrationStatus.Approved
                            ? 'bg-green-500'
                            : reg.registrationStatus === RegistrationStatus.Pending
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                      />

                      <div className="p-5 flex items-center justify-between gap-4 flex-wrap">
                        {/* Left */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-0.5 flex-shrink-0">
                            {getRegistrationIcon(reg.registrationStatus)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                                {reg.electionTitle}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getElectionStatusColor(
                                  reg.electionStatus
                                )}`}
                              >
                                {getElectionStatusLabel(reg.electionStatus)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRegistrationBadge(
                                  reg.registrationStatus
                                )}`}
                              >
                                {getRegistrationLabel(reg.registrationStatus)}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-gray-500">
                                · Registered{' '}
                                {new Date(reg.registeredAt * 1000).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>

                            {/* Status-specific description */}
                            {reg.registrationStatus === RegistrationStatus.Pending && (
                              <p className="text-xs text-yellow-400/70 mt-1.5">
                                Awaiting admin approval before you can vote.
                              </p>
                            )}
                            {reg.registrationStatus === RegistrationStatus.Rejected && (
                              <p className="text-xs text-red-400/70 mt-1.5">
                                Your registration was rejected. Contact the election admin for details.
                              </p>
                            )}
                            {reg.registrationStatus === RegistrationStatus.Revoked && (
                              <p className="text-xs text-red-400/70 mt-1.5">
                                Your voting access was revoked by an admin.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: link to election */}
                        <Link href={`/elections/${reg.electionPublicKey}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-300 dark:border-gray-700 hover:border-violet-400 dark:hover:border-gray-600 flex-shrink-0"
                          >
                            {reg.registrationStatus === RegistrationStatus.Approved
                              ? 'Go Vote'
                              : 'View Election'}
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unregistered whitelist elections — offer to register */}
            {unregisteredElections.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  Available to Register
                </h2>
                <div className="space-y-3">
                  {unregisteredElections.map((election) => {
                    const isRequesting = requestingFor === election.publicKey;
                    const hasSucceeded = requestSuccess[election.publicKey];
                    const errMsg = requestError[election.publicKey];

                    if (hasSucceeded) {
                      // Show success state inline
                      return (
                        <div
                          key={election.publicKey}
                          className="bg-green-500/5 border border-green-500/20 rounded-lg p-5"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                Registration requested for <span className="text-slate-900 dark:text-white">{election.title}</span>
                              </p>
                              <p className="text-xs text-slate-500 dark:text-gray-500 mt-0.5">
                                Awaiting admin approval. Check back soon.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={election.publicKey}
                        className="bg-white/80 dark:bg-gray-800/50 border border-violet-200/50 dark:border-gray-700 rounded-lg p-5 flex items-center justify-between gap-4 flex-wrap shadow-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{election.title}</h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getElectionStatusColor(
                                election.electionStatus
                              )}`}
                            >
                              {getElectionStatusLabel(election.electionStatus)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">
                              Whitelist
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-gray-500 mt-1">
                            Not registered · Request approval to participate
                          </p>
                          {errMsg && (
                            <p className="text-xs text-red-400 mt-1.5">{errMsg}</p>
                          )}
                        </div>

                        <Button
                          onClick={() => handleRequestRegistration(election.publicKey)}
                          disabled={isRequesting}
                          className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                          size="sm"
                        >
                          {isRequesting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              Requesting...
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                              Request Registration
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state — no registrations and nothing to register for */}
            {registrations.length === 0 && unregisteredElections.length === 0 && (
              <div className="text-center py-20 bg-slate-100/50 dark:bg-gray-800/30 border border-slate-200 dark:border-gray-700 rounded-lg">
                <div className="w-16 h-16 bg-slate-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserCheck className="w-8 h-8 text-slate-400 dark:text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-300 mb-2">No registrations</h3>
                <p className="text-slate-500 dark:text-gray-500 max-w-md mx-auto">
                  You aren't registered for any whitelist elections yet. Browse elections to find ones you can register for, or participate in open elections directly.
                </p>
                <Link href="/elections">
                  <Button className="mt-6 bg-purple-600 hover:bg-purple-700">
                    Browse Elections <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}