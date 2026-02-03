'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { ElectionStatus, parseElectionStatus, VoterRegistrationType, parseVoterRegistrationType, RegistrationStatus } from '@/lib/types';
import {
  getElectionStatusLabel,
  getElectionStatusColor,
  formatElectionTime,
  getTimeRemaining,
  isVotingOpen,
} from '@/lib/election-utils';
import { getVoterRegistrationPda, getVoteRecordPda } from '@/lib/helpers';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/shared/AppLayout';
import { VoterSidebar } from '@/components/shared/VoterSidebar';
import {
  AlertCircle,
  Calendar,
  Filter,
  Clock,
  Users,
  CheckCircle2,
  Vote,
  ArrowRight,
  Search,
} from 'lucide-react';
import Link from 'next/link';

interface EnrichedElection {
  publicKey: string;
  electionId: number;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  totalVotes: string;
  candidateCount: string;
  status: ElectionStatus;
  voterRegistrationType: VoterRegistrationType;
  // Voter-specific enrichment
  hasVoted: boolean;
  registrationStatus: RegistrationStatus | null; // null = not registered / not applicable
}

export default function VoterElectionsPage() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [elections, setElections] = useState<EnrichedElection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'finalized'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingRegCount, setPendingRegCount] = useState(0);

  const fetchData = async () => {
    if (!program) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // @ts-ignore
      const electionAccounts = await program.account.election.all();

      const enriched: EnrichedElection[] = await Promise.all(
        electionAccounts.map(async (account: any) => {
          const electionPubkey = account.publicKey;
          const status = parseElectionStatus(account.account.status);
          const regType = parseVoterRegistrationType(account.account.voterRegistrationType);

          let hasVoted = false;
          let registrationStatus: RegistrationStatus | null = null;

          if (publicKey) {
            // Check if voter has voted
            try {
              const [voteRecordPda] = getVoteRecordPda(electionPubkey, publicKey, program.programId);
              // @ts-ignore
              await program.account.voteRecord.fetch(voteRecordPda);
              hasVoted = true;
            } catch {
              hasVoted = false;
            }

            // Check voter registration for whitelist elections
            if (regType === VoterRegistrationType.Whitelist) {
              try {
                const [voterRegPda] = getVoterRegistrationPda(electionPubkey, publicKey, program.programId);
                // @ts-ignore
                const reg = await program.account.voterRegistration.fetch(voterRegPda);
                if (reg.status.pending !== undefined) registrationStatus = RegistrationStatus.Pending;
                else if (reg.status.approved !== undefined) registrationStatus = RegistrationStatus.Approved;
                else if (reg.status.rejected !== undefined) registrationStatus = RegistrationStatus.Rejected;
                else if (reg.status.revoked !== undefined) registrationStatus = RegistrationStatus.Revoked;
              } catch {
                registrationStatus = null; // not registered
              }
            }
          }

          return {
            publicKey: electionPubkey.toString(),
            electionId: account.account.electionId?.toNumber
              ? account.account.electionId.toNumber()
              : Number(account.account.electionId),
            title: account.account.title,
            description: account.account.description,
            startTime: account.account.startTime?.toNumber
              ? account.account.startTime.toNumber()
              : Number(account.account.startTime),
            endTime: account.account.endTime?.toNumber
              ? account.account.endTime.toNumber()
              : Number(account.account.endTime),
            totalVotes: account.account.totalVotes?.toString
              ? account.account.totalVotes.toString()
              : String(account.account.totalVotes),
            candidateCount: account.account.candidateCount?.toString
              ? account.account.candidateCount.toString()
              : String(account.account.candidateCount),
            status,
            voterRegistrationType: regType,
            hasVoted,
            registrationStatus,
          };
        })
      );

      enriched.sort((a, b) => b.electionId - a.electionId);
      setElections(enriched);
      setPendingRegCount(enriched.filter(e => e.registrationStatus === RegistrationStatus.Pending).length);
    } catch (err: any) {
      logger.error('Failed to fetch elections', err);
      setError('Failed to load elections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [program, publicKey]);

  // Filtering logic
  const filtered = elections.filter((e) => {
    // Status filter
    if (statusFilter === 'active' && e.status !== ElectionStatus.Active) return false;
    if (statusFilter === 'upcoming' && e.status !== ElectionStatus.Draft) return false;
    if (statusFilter === 'finalized' && e.status !== ElectionStatus.Finalized) return false;

    // Search
    if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    return true;
  });

  // Only show elections relevant to voters (Active, Ended, Finalized — skip Draft unless searching)
  const visibleElections = statusFilter === 'all'
    ? filtered.filter(e => e.status !== ElectionStatus.Draft && e.status !== ElectionStatus.Cancelled)
    : filtered;

  const activeCount = elections.filter(e => e.status === ElectionStatus.Active).length;
  const finalizedCount = elections.filter(e => e.status === ElectionStatus.Finalized).length;

  return (
    <AppLayout sidebar={<VoterSidebar pendingCount={pendingRegCount} />} showFooter={false}>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Browse Elections</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Participate in active elections or review past results
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/80 dark:bg-slate-800/60 border border-violet-200/50 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Vote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeCount}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Active</p>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-slate-800/60 border border-violet-200/50 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-violet-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{finalizedCount}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Finalized</p>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-slate-800/60 border border-violet-200/50 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {elections.filter(e => e.hasVoted).length}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Your Votes</p>
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search elections..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-violet-200/50 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-violet-400 dark:focus:border-purple-500 transition-colors shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            {(['all', 'active', 'finalized'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === f
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-violet-200/50 dark:border-slate-700 hover:border-violet-400'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Elections List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : visibleElections.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No elections found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleElections.map((election) => {
              const isActive = election.status === ElectionStatus.Active;
              const isFinalized = election.status === ElectionStatus.Finalized;
              const canVote =
                isActive &&
                !election.hasVoted &&
                (election.voterRegistrationType === VoterRegistrationType.Open ||
                  election.registrationStatus === RegistrationStatus.Approved);
              const needsRegistration =
                isActive &&
                election.voterRegistrationType === VoterRegistrationType.Whitelist &&
                election.registrationStatus === null;

              return (
                <div
                  key={election.publicKey}
                  className="bg-white/80 dark:bg-slate-800/50 border border-violet-200/50 dark:border-slate-700 rounded-xl p-5 hover:border-violet-300 dark:hover:border-slate-600 transition-colors shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{election.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getElectionStatusColor(election.status)}`}>
                          {getElectionStatusLabel(election.status)}
                        </span>
                        {election.hasVoted && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Voted
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {election.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">{election.description}</p>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center gap-5 text-xs text-gray-500 dark:text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {election.candidateCount} candidates
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Vote className="w-3.5 h-3.5" />
                          {election.totalVotes} votes cast
                        </span>
                        {isActive && (
                          <span className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-500">
                            <Clock className="w-3.5 h-3.5" />
                            Ends {getTimeRemaining(election.endTime)}
                          </span>
                        )}
                        <span className={`flex items-center gap-1.5 ${
                          election.voterRegistrationType === VoterRegistrationType.Whitelist
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {election.voterRegistrationType === VoterRegistrationType.Whitelist ? '🔒 Whitelist' : '🌐 Open'}
                        </span>
                      </div>

                      {/* Registration status notice */}
                      {election.registrationStatus === RegistrationStatus.Pending && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          Your registration is pending approval
                        </div>
                      )}
                      {election.registrationStatus === RegistrationStatus.Rejected && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          Your registration was rejected
                        </div>
                      )}
                      {needsRegistration && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          Registration required — visit the election to register
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0">
                      {canVote ? (
                        <Link href={`/elections/${election.publicKey}`}>
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                            <Vote className="w-3.5 h-3.5 mr-1.5" />
                            Vote Now
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/elections/${election.publicKey}`}>
                          <Button size="sm" variant="outline" className="border-violet-200/50 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-violet-400 dark:hover:border-purple-500">
                            <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                            {isFinalized ? 'View Results' : 'Details'}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}