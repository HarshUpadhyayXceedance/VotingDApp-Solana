'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { getAdminRegistryPda, getAdminPda } from '@/lib/helpers';
import { logger } from '@/lib/logger';
import { parseElectionStatus } from '@/lib/types';
import {
  getElectionStatusLabel,
  getElectionStatusColor,
  formatElectionTime,
  canModifyElection,
  canStartElection,
  canEndElection,
  canFinalizeElection,
} from '@/lib/election-utils';
import { Button } from '@/components/ui/button';
import { AddCandidateModal } from '@/components/admin/AddCandidateModal';
import { CandidateCard } from '@/components/admin/CandidateCard';
import { AppLayout } from '@/components/shared/AppLayout';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  UserPlus,
  Play,
  StopCircle,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ElectionDetailPage() {
  const params = useParams<{ id: string }>();
  const electionId = params.id;

  if (!electionId) {
    throw new Error('Election ID missing from route');
  }

  const { publicKey } = useWallet();
  const program = useProgram();

  const [election, setElection] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchElectionData = async () => {
    if (!program) return;

    try {
      setLoading(true);
      setError('');

      const electionPubkey = new PublicKey(electionId);

      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      try {
        // @ts-ignore
        const adminRegistry = await program.account.adminRegistry.fetch(adminRegistryPda);
        if (publicKey) {
          setIsSuperAdmin(publicKey.equals(adminRegistry.superAdmin));
        }
      } catch (err: any) {
        logger.error('Failed to fetch admin registry', err, { electionId });
      }

      // @ts-ignore
      const electionAccount = await program.account.election.fetch(electionPubkey);

      const electionData = {
        publicKey: electionId,
        electionId: electionAccount.electionId.toNumber
          ? electionAccount.electionId.toNumber()
          : electionAccount.electionId,
        title: electionAccount.title,
        description: electionAccount.description,
        startTime: electionAccount.startTime.toNumber(),
        endTime: electionAccount.endTime.toNumber(),
        totalVotes: electionAccount.totalVotes.toString(),
        candidateCount: electionAccount.candidateCount.toString(),
        voterRegistrationType: electionAccount.voterRegistrationType,
        status: parseElectionStatus(electionAccount.status),
      };

      setElection(electionData);

      // @ts-ignore
      const candidateAccounts = await program.account.candidate.all([
        {
          memcmp: {
            offset: 8,
            bytes: electionPubkey.toBase58(),
          },
        },
      ]);

      const candidatesData = candidateAccounts.map((account: any) => ({
        publicKey: account.publicKey.toString(),
        candidateId: account.account.candidateId.toNumber
          ? account.account.candidateId.toNumber()
          : account.account.candidateId,
        name: account.account.name,
        description: account.account.description,
        imageUrl: account.account.imageUrl,
        voteCount: account.account.voteCount.toString(),
        electionPubkey: account.account.election.toString(),
      }));

      candidatesData.sort((a: any, b: any) => a.candidateId - b.candidateId);
      setCandidates(candidatesData);
    } catch (err: any) {
      logger.error('Failed to fetch election', err, { electionId });
      setError('Failed to load election data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElectionData();
  }, [program, electionId]);

  const handleLifecycleAction = async (action: 'start' | 'end' | 'finalize') => {
    if (!program || !publicKey) return;

    try {
      const electionPubkey = new PublicKey(electionId);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      let tx: string | undefined;

      if (action === 'start') {
        // @ts-ignore
        tx = await program.methods.startElection().accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          authority: publicKey,
        }).rpc();
      } else if (action === 'end') {
        // @ts-ignore
        tx = await program.methods.endElection().accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          authority: publicKey,
        }).rpc();
      } else if (action === 'finalize') {
        // @ts-ignore
        tx = await program.methods.finalizeElection().accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          authority: publicKey,
        }).rpc();
      }

      if (!tx) {
        throw new Error('Transaction signature missing');
      }

      logger.transaction(`election ${action}ed`, tx, { electionId });
      fetchElectionData();
    } catch (err: any) {
      logger.error(`Failed to ${action} election`, err, { electionId });
      alert(err.message || `Failed to ${action} election`);
    }
  };

  const handleDeleteCandidate = async (candidatePublicKey: string) => {
    if (!confirm('Are you sure you want to remove this candidate?')) return;
    if (!program || !publicKey) return;

    try {
      const candidatePubkey = new PublicKey(candidatePublicKey);
      const electionPubkey = new PublicKey(electionId);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      // @ts-ignore
      const tx = await program.methods.removeCandidate().accounts({
        adminRegistry: adminRegistryPda,
        adminAccount: adminPda,
        election: electionPubkey,
        candidate: candidatePubkey,
        authority: publicKey,
      }).rpc();

      logger.transaction('candidate removed', tx, { electionId });
      fetchElectionData();
    } catch (err: any) {
      logger.error('Failed to remove candidate', err, { electionId });
      alert(err.message || 'Failed to remove candidate');
    }
  };

  /* 🔽 EVERYTHING BELOW IS UNCHANGED UI 🔽 */

  if (!publicKey) {
    return (
      <AppLayout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Wallet Not Connected
            </h2>
            <p className="text-slate-600 dark:text-gray-400">
              Please connect your wallet
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout sidebar={<AdminSidebar isSuperAdmin={isSuperAdmin} />} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error || !election) {
    return (
      <AppLayout sidebar={<AdminSidebar isSuperAdmin={isSuperAdmin} />} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-gray-400">
              {error || 'Election not found'}
            </p>
            <Link href="/admin/elections">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Elections
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sidebar={<AdminSidebar isSuperAdmin={isSuperAdmin} />} showFooter={false}>
      <div className="container mx-auto px-4 py-8">
        <Link href="/admin/elections">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Elections
          </Button>
        </Link>

        {/* Election Header */}
        <div className="bg-white/80 dark:bg-gray-800/50 border border-violet-200/50 dark:border-gray-700 rounded-lg p-8 mb-8 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white">{election.title}</h1>
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold ${getElectionStatusColor(
                    election.status
                  )}`}
                >
                  {getElectionStatusLabel(election.status)}
                </span>
              </div>
              {election.description && (
                <p className="text-slate-600 dark:text-gray-400 text-lg mb-4">{election.description}</p>
              )}
              <div className="flex items-center gap-6 text-slate-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">ID: {election.electionId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {formatElectionTime(election.startTime)} - {formatElectionTime(election.endTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Lifecycle Controls */}
          <div className="flex items-center gap-3">
            {canStartElection(election) && (
              <Button
                onClick={() => handleLifecycleAction('start')}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Election
              </Button>
            )}

            {canEndElection(election) && (
              <Button
                onClick={() => handleLifecycleAction('end')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                End Election
              </Button>
            )}

            {canFinalizeElection(election) && (
              <Button
                onClick={() => handleLifecycleAction('finalize')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Finalize Results
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 dark:bg-gray-800/50 border border-violet-200/50 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-gray-400 text-sm mb-1">Candidates</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{election.candidateCount}</p>
              </div>
              <UserPlus className="w-12 h-12 text-violet-500 dark:text-purple-400 opacity-50" />
            </div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/50 border border-violet-200/50 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-gray-400 text-sm mb-1">Total Votes</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{election.totalVotes}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-500 dark:text-green-400 opacity-50" />
            </div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/50 border border-violet-200/50 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-gray-400 text-sm mb-1">Registration</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {election.voterRegistrationType?.open ? 'Open' : 'Whitelist'}
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-500 dark:text-blue-400 opacity-50" />
            </div>
          </div>
        </div>

        {/* Candidates Section */}
        <div className="bg-white/80 dark:bg-gray-800/50 border border-violet-200/50 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Candidates</h2>
            {canModifyElection(election) && (
              <Button
                onClick={() => setShowAddCandidateModal(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Candidate
              </Button>
            )}
          </div>

          {candidates.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-slate-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-gray-400 mb-4">No candidates added yet</p>
              {canModifyElection(election) && (
                <Button onClick={() => setShowAddCandidateModal(true)} variant="outline">
                  Add Your First Candidate
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.publicKey}
                  candidate={candidate}
                  canDelete={canModifyElection(election)}
                  onDelete={handleDeleteCandidate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddCandidateModal
        open={showAddCandidateModal}
        onClose={() => setShowAddCandidateModal(false)}
        onSuccess={fetchElectionData}
        electionPublicKey={electionId}
      />
    </AppLayout>
  );
}