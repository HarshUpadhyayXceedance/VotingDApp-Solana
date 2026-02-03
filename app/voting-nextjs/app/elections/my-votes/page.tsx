'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import {
  ElectionStatus,
  parseElectionStatus,
  parseVoterRegistrationType,
} from '@/lib/types';
import {
  getElectionStatusLabel,
  getElectionStatusColor,
} from '@/lib/election-utils';
import { getVoteRecordPda } from '@/lib/helpers';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/shared/AppLayout';
import { VoterSidebar } from '@/components/shared/VoterSidebar';
import {
  AlertCircle,
  CheckCircle2,
  Vote,
  Calendar,
  ArrowRight,
  Clock,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';

interface VoteRecord {
  electionPublicKey: string;
  electionTitle: string;
  electionStatus: ElectionStatus;
  candidateName: string;
  candidatePublicKey: string;
  votedAt: number;
  isWinner: boolean;
}

export default function MyVotesPage() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [voteRecords, setVoteRecords] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchVotes = async () => {
    if (!program || !publicKey) return;

    try {
      setLoading(true);
      setError('');

      // Fetch all elections
      // @ts-ignore
      const electionAccounts = await program.account.election.all();

      const records: VoteRecord[] = [];

      for (const electionAccount of electionAccounts) {
        const electionPubkey = electionAccount.publicKey;
        const electionStatus = parseElectionStatus(electionAccount.account.status);

        // Skip Draft and Cancelled elections — voter can't have voted in them
        if (
          electionStatus === ElectionStatus.Draft ||
          electionStatus === ElectionStatus.Cancelled
        ) {
          continue;
        }

        try {
          // Derive vote_record PDA for this election + voter
          const [voteRecordPda] = getVoteRecordPda(
            electionPubkey,
            publicKey,
            program.programId
          );

          // @ts-ignore
          const voteRecord = await program.account.voteRecord.fetch(voteRecordPda);

          // We have a vote record — now resolve the candidate name
          const candidatePubkey = voteRecord.candidate;
          let candidateName = 'Unknown Candidate';

          try {
            // @ts-ignore
            const candidateAccount = await program.account.candidate.fetch(candidatePubkey);
            candidateName = candidateAccount.name;
          } catch {
            // Candidate account missing — fallback to truncated pubkey
            candidateName = candidatePubkey.toString().slice(0, 8) + '...';
          }

          // Determine if this candidate was the winner (only meaningful for Finalized)
          let isWinner = false;
          if (electionStatus === ElectionStatus.Finalized) {
            try {
              // @ts-ignore
              const allCandidates = await program.account.candidate.all([
                {
                  memcmp: {
                    offset: 8,
                    bytes: electionPubkey.toBase58(),
                  },
                },
              ]);

              if (allCandidates.length > 0) {
                const winner = allCandidates.reduce((max: any, c: any) => {
                  const maxVotes = max.account.voteCount?.toNumber
                    ? max.account.voteCount.toNumber()
                    : Number(max.account.voteCount);
                  const cVotes = c.account.voteCount?.toNumber
                    ? c.account.voteCount.toNumber()
                    : Number(c.account.voteCount);
                  return cVotes > maxVotes ? c : max;
                }, allCandidates[0]);

                isWinner = winner.publicKey.equals(candidatePubkey);
              }
            } catch {
              // Can't determine winner — leave as false
            }
          }

          records.push({
            electionPublicKey: electionPubkey.toString(),
            electionTitle: electionAccount.account.title,
            electionStatus,
            candidateName,
            candidatePublicKey: candidatePubkey.toString(),
            votedAt: voteRecord.votedAt?.toNumber
              ? voteRecord.votedAt.toNumber()
              : Number(voteRecord.votedAt),
            isWinner,
          });
        } catch {
          // No vote record for this election — skip
        }
      }

      // Sort by votedAt descending (most recent first)
      records.sort((a, b) => b.votedAt - a.votedAt);
      setVoteRecords(records);
    } catch (err: any) {
      logger.error('Failed to fetch vote records', err);
      setError('Failed to load your votes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVotes();
  }, [program, publicKey]);

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
            <p className="text-slate-600 dark:text-gray-400">Please connect your wallet to view your votes</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sidebar={<VoterSidebar />} showFooter={false}>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Vote className="w-5 h-5 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Votes</h1>
          </div>
          <p className="text-slate-600 dark:text-gray-400">
            A verified record of every vote you have cast on-chain
          </p>
        </div>

        {/* Summary card */}
        <div className="bg-white/80 dark:bg-gray-800/50 border border-violet-200/50 dark:border-gray-700 rounded-lg p-5 mb-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-500/10 dark:bg-purple-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-violet-500 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-slate-600 dark:text-gray-400 text-sm">Total Votes Cast</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{voteRecords.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-slate-500 dark:text-gray-500 text-xs">Winner picks</p>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {voteRecords.filter((r) => r.isWinner).length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 dark:text-gray-500 text-xs">Active elections</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {voteRecords.filter((r) => r.electionStatus === ElectionStatus.Active).length}
              </p>
            </div>
          </div>
        </div>

        {/* Vote list */}
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
              onClick={fetchVotes}
            >
              Retry
            </Button>
          </div>
        ) : voteRecords.length === 0 ? (
          <div className="text-center py-20 bg-slate-100/50 dark:bg-gray-800/30 border border-slate-200 dark:border-gray-700 rounded-lg">
            <div className="w-16 h-16 bg-slate-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Vote className="w-8 h-8 text-slate-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-300 mb-2">No votes yet</h3>
            <p className="text-slate-500 dark:text-gray-500 max-w-md mx-auto">
              You haven't voted in any elections. Browse active elections to cast your first vote.
            </p>
            <Link href="/elections">
              <Button className="mt-6 bg-purple-600 hover:bg-purple-700">
                Browse Elections <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {voteRecords.map((record, index) => {
              const isFinalized = record.electionStatus === ElectionStatus.Finalized;
              const isActive = record.electionStatus === ElectionStatus.Active;

              return (
                <div
                  key={`${record.electionPublicKey}-${record.candidatePublicKey}`}
                  className="bg-white/80 dark:bg-gray-800/50 border border-violet-200/50 dark:border-gray-700 rounded-lg overflow-hidden hover:border-violet-300 dark:hover:border-gray-600 transition-all duration-200 shadow-sm"
                >
                  {/* Top accent line */}
                  <div
                    className={`h-0.5 ${
                      record.isWinner
                        ? 'bg-gradient-to-r from-yellow-400 to-purple-500'
                        : isActive
                        ? 'bg-green-500'
                        : isFinalized
                        ? 'bg-purple-500'
                        : 'bg-gray-600'
                    }`}
                  />

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      {/* Left: vote info */}
                      <div className="flex-1 min-w-0">
                        {/* Election title + status */}
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                            {record.electionTitle}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getElectionStatusColor(
                              record.electionStatus
                            )}`}
                          >
                            {getElectionStatusLabel(record.electionStatus)}
                          </span>
                        </div>

                        {/* Voted for */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-slate-500 dark:text-gray-500 text-sm">Voted for</span>
                          <span className="text-slate-900 dark:text-white font-semibold text-sm">
                            {record.candidateName}
                          </span>
                          {record.isWinner && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400 font-semibold">
                              <Trophy className="w-3 h-3" /> Winner
                            </span>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {new Date(record.votedAt * 1000).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}{' '}
                            at{' '}
                            {new Date(record.votedAt * 1000).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Right: action */}
                      <Link href={`/elections/${record.electionPublicKey}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-300 dark:border-gray-700 hover:border-violet-400 dark:hover:border-gray-600 flex-shrink-0"
                        >
                          {isFinalized ? 'View Results' : 'View Election'}
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </Link>
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