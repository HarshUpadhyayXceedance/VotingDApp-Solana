'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { getAdminRegistryPda, getAdminPda } from '@/lib/helpers';
import { ElectionStatus, parseElectionStatus } from '@/lib/types';
import {
  getElectionStatusLabel,
  getElectionStatusColor,
  formatElectionTime,
} from '@/lib/election-utils';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/shared/AppLayout';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import {
  AlertCircle,
  BarChart3,
  Trophy,
  Users,
  Vote,
  Calendar,
  Clock,
  ArrowRight,
  Scale,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

interface CandidateResult {
  publicKey: string;
  candidateId: number;
  name: string;
  description: string;
  voteCount: number;
  percentage: number;
}

interface ElectionResult {
  publicKey: string;
  electionId: number;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  totalVotes: number;
  candidateCount: number;
  status: ElectionStatus;
  candidates: CandidateResult[];
  winners: CandidateResult[];
  isDraw: boolean;
}

export default function ResultsPage() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [results, setResults] = useState<ElectionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [filter, setFilter] = useState<'all' | 'finalized' | 'ended'>('all');

  const fetchResults = async () => {
    if (!program || !publicKey) return;

    try {
      setLoading(true);
      setError('');

      // Check admin status
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      let adminRegistry;
      try {
        // @ts-ignore
        adminRegistry = await program.account.adminRegistry.fetch(adminRegistryPda);
      } catch (e) {
        setError('Failed to connect to the program.');
        setLoading(false);
        return;
      }

      const isSuperAdminUser = publicKey.equals(adminRegistry.superAdmin);
      setIsSuperAdmin(isSuperAdminUser);

      const [adminPda] = getAdminPda(publicKey, program.programId);
      let hasAdminAccount = false;
      try {
        // @ts-ignore
        const adminAccount = await program.account.admin.fetch(adminPda);
        hasAdminAccount = adminAccount.is_active ?? adminAccount.isActive;
      } catch (e) {
        hasAdminAccount = false;
      }

      setIsAdmin(isSuperAdminUser || hasAdminAccount);

      // Fetch all elections
      // @ts-ignore
      const electionAccounts = await program.account.election.all();

      const electionResults: ElectionResult[] = [];

      for (const electionAccount of electionAccounts) {
        const status = parseElectionStatus(electionAccount.account.status);

        // Only include ended or finalized elections
        if (status !== ElectionStatus.Ended && status !== ElectionStatus.Finalized) {
          continue;
        }

        const electionPubkey = electionAccount.publicKey;
        const totalVotes = Number(
          electionAccount.account.totalVotes?.toString?.() ?? electionAccount.account.totalVotes
        );

        // Fetch candidates for this election
        // @ts-ignore
        const candidateAccounts = await program.account.candidate.all([
          {
            memcmp: {
              offset: 8,
              bytes: electionPubkey.toBase58(),
            },
          },
        ]);

        const candidates: CandidateResult[] = candidateAccounts.map((acc: any) => {
          const voteCount = Number(acc.account.voteCount?.toString?.() ?? acc.account.voteCount);
          return {
            publicKey: acc.publicKey.toString(),
            candidateId: acc.account.candidateId?.toNumber
              ? acc.account.candidateId.toNumber()
              : Number(acc.account.candidateId),
            name: acc.account.name,
            description: acc.account.description,
            voteCount,
            percentage: totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0,
          };
        });

        // Sort candidates by vote count (descending)
        candidates.sort((a, b) => b.voteCount - a.voteCount);

        // Determine winners (handle draws)
        let winners: CandidateResult[] = [];
        let isDraw = false;

        if (candidates.length > 0 && totalVotes > 0) {
          const maxVotes = candidates[0].voteCount;
          winners = candidates.filter((c) => c.voteCount === maxVotes);
          isDraw = winners.length > 1;
        }

        electionResults.push({
          publicKey: electionPubkey.toString(),
          electionId: electionAccount.account.electionId?.toNumber
            ? electionAccount.account.electionId.toNumber()
            : Number(electionAccount.account.electionId),
          title: electionAccount.account.title,
          description: electionAccount.account.description,
          startTime: electionAccount.account.startTime?.toNumber
            ? electionAccount.account.startTime.toNumber()
            : Number(electionAccount.account.startTime),
          endTime: electionAccount.account.endTime?.toNumber
            ? electionAccount.account.endTime.toNumber()
            : Number(electionAccount.account.endTime),
          totalVotes,
          candidateCount: Number(
            electionAccount.account.candidateCount?.toString?.() ?? electionAccount.account.candidateCount
          ),
          status,
          candidates,
          winners,
          isDraw,
        });
      }

      // Sort by election ID (most recent first)
      electionResults.sort((a, b) => b.electionId - a.electionId);
      setResults(electionResults);
    } catch (err: any) {
      console.error('Error fetching results:', err);
      setError('Failed to load election results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [program, publicKey]);

  // Filter results based on selected filter
  const filteredResults =
    filter === 'all'
      ? results
      : results.filter((r) =>
          filter === 'finalized'
            ? r.status === ElectionStatus.Finalized
            : r.status === ElectionStatus.Ended
        );

  // Stats
  const totalElections = results.length;
  const finalizedCount = results.filter((r) => r.status === ElectionStatus.Finalized).length;
  const endedCount = results.filter((r) => r.status === ElectionStatus.Ended).length;
  const totalVotesCast = results.reduce((sum, r) => sum + r.totalVotes, 0);

  if (!publicKey) {
    return (
      <AppLayout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Wallet Not Connected
            </h2>
            <p className="text-slate-600 dark:text-gray-400">Please connect your wallet</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin && !loading) {
    return (
      <AppLayout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-slate-600 dark:text-gray-400">You are not an admin</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sidebar={<AdminSidebar isSuperAdmin={isSuperAdmin} />} showFooter={false}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-violet-500/10 dark:bg-purple-500/10 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-violet-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Election Results</h1>
              <p className="text-slate-600 dark:text-slate-400">
                View and analyze completed election outcomes
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 dark:bg-slate-800/50 border border-violet-200/50 dark:border-slate-700 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-violet-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalElections}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-slate-800/50 border border-violet-200/50 dark:border-slate-700 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{finalizedCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Finalized</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-slate-800/50 border border-violet-200/50 dark:border-slate-700 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{endedCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Awaiting Finalization</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-slate-800/50 border border-violet-200/50 dark:border-slate-700 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalVotesCast}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Votes Cast</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mr-2">Filter:</span>
          {(['all', 'finalized', 'ended'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === f
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-violet-200/50 dark:border-slate-700 hover:border-violet-400'
              }`}
            >
              {f === 'all' ? 'All' : f === 'finalized' ? 'Finalized' : 'Awaiting Finalization'}
            </button>
          ))}
        </div>

        {/* Results List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-600 dark:text-gray-400 text-sm">Loading results...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400">{error}</p>
            <Button
              variant="outline"
              className="mt-4 border-slate-300 dark:border-gray-700"
              onClick={fetchResults}
            >
              Retry
            </Button>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-20 bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-slate-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-300 mb-2">
              No Results Available
            </h3>
            <p className="text-slate-500 dark:text-gray-500 max-w-md mx-auto">
              {filter === 'all'
                ? 'No elections have been completed yet. Results will appear here once elections are ended or finalized.'
                : `No ${filter === 'finalized' ? 'finalized' : 'ended'} elections found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredResults.map((election) => (
              <div
                key={election.publicKey}
                className="bg-white/80 dark:bg-slate-800/50 border border-violet-200/50 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Election Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                          {election.title}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getElectionStatusColor(
                            election.status
                          )}`}
                        >
                          {getElectionStatusLabel(election.status)}
                        </span>
                      </div>
                      {election.description && (
                        <p className="text-slate-600 dark:text-gray-400 text-sm mb-3">
                          {election.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatElectionTime(election.endTime)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {election.candidateCount} candidates
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Vote className="w-3.5 h-3.5" />
                          {election.totalVotes} votes
                        </span>
                      </div>
                    </div>
                    <Link href={`/admin/elections/${election.publicKey}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-300 dark:border-slate-600 hover:border-violet-400 dark:hover:border-purple-500"
                      >
                        View Details
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Winner/Draw Banner */}
                {election.totalVotes > 0 && election.winners.length > 0 && (
                  <div
                    className={`p-5 ${
                      election.isDraw
                        ? 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-orange-500/20'
                        : 'bg-gradient-to-r from-yellow-500/10 to-violet-500/10 border-b border-yellow-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                          election.isDraw
                            ? 'bg-orange-500/20'
                            : 'bg-yellow-500/20'
                        }`}
                      >
                        {election.isDraw ? (
                          <Scale className="w-7 h-7 text-orange-500 dark:text-orange-400" />
                        ) : (
                          <Trophy className="w-7 h-7 text-yellow-500 dark:text-yellow-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {election.isDraw ? (
                          <>
                            <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wider mb-0.5">
                              Draw
                            </p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                              {election.winners.map((w) => w.name).join(' & ')}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-gray-400">
                              Tied with {election.winners[0].voteCount} votes each (
                              {election.winners[0].percentage.toFixed(1)}%)
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold uppercase tracking-wider mb-0.5">
                              Winner
                            </p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">
                              {election.winners[0].name}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-gray-400">
                              {election.winners[0].voteCount} votes (
                              {election.winners[0].percentage.toFixed(1)}% of total)
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* No Votes Message */}
                {election.totalVotes === 0 && (
                  <div className="p-5 bg-slate-100/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <Vote className="w-7 h-7 text-slate-400 dark:text-gray-500" />
                      </div>
                      <div>
                        <p className="text-slate-700 dark:text-gray-300 font-semibold">No Votes Cast</p>
                        <p className="text-sm text-slate-500 dark:text-gray-500">
                          This election ended without any votes being recorded.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Candidates Results */}
                {election.candidates.length > 0 && (
                  <div className="p-5">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      All Candidates ({election.candidates.length})
                    </h4>
                    <div className="space-y-3">
                      {election.candidates.map((candidate, index) => {
                        const isWinner =
                          election.winners.some((w) => w.publicKey === candidate.publicKey) &&
                          election.totalVotes > 0;
                        const isTopThree = index < 3 && election.totalVotes > 0;

                        return (
                          <div
                            key={candidate.publicKey}
                            className={`p-4 rounded-lg border transition-colors ${
                              isWinner
                                ? election.isDraw
                                  ? 'bg-orange-500/5 border-orange-500/30'
                                  : 'bg-yellow-500/5 border-yellow-500/30'
                                : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4 mb-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`text-lg font-bold ${
                                    isTopThree
                                      ? index === 0
                                        ? election.isDraw
                                          ? 'text-orange-500'
                                          : 'text-yellow-500'
                                        : index === 1
                                        ? 'text-slate-400'
                                        : 'text-amber-600'
                                      : 'text-slate-400 dark:text-gray-500'
                                  }`}
                                >
                                  #{index + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                                      {candidate.name}
                                    </span>
                                    {isWinner && (
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                          election.isDraw
                                            ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                                            : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                                        }`}
                                      >
                                        {election.isDraw ? 'Tied' : 'Winner'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                  {candidate.voteCount}
                                </span>
                                <span className="text-slate-500 dark:text-gray-400 text-sm ml-1">
                                  votes
                                </span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isWinner
                                    ? election.isDraw
                                      ? 'bg-orange-500'
                                      : 'bg-yellow-500'
                                    : 'bg-violet-500'
                                }`}
                                style={{ width: `${candidate.percentage}%` }}
                              />
                            </div>
                            <div className="flex justify-end mt-1">
                              <span className="text-xs text-slate-500 dark:text-gray-500">
                                {candidate.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
