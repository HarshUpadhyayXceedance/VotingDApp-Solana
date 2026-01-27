'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { parseElectionStatus } from '@/lib/types';
import {
  getElectionStatusLabel,
  getElectionStatusColor,
  formatElectionTime,
  canModifyElection,
} from '@/lib/election-utils';
import { Button } from '@/components/ui/button';
import { AddCandidateModal } from '@/components/admin/AddCandidateModal';
import { ElectionLifecycleControls } from '@/components/admin/ElectionLifecycleControls';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  UserPlus,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function ElectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const program = useProgram();

  const electionId = params.id as string;

  const [election, setElection] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);

  const fetchElectionData = async () => {
    if (!program || !electionId) return;

    try {
      setLoading(true);
      setError('');

      const electionPubkey = new PublicKey(electionId);

      // Fetch election
      // @ts-ignore
      const electionAccount = await program.account.election.fetch(electionPubkey);

      const electionData = {
        publicKey: electionId,
        ...electionAccount,
        status: parseElectionStatus(electionAccount.status),
      };

      setElection(electionData);

      // Fetch candidates
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
        ...account.account,
      }));

      // Sort by candidate ID
      candidatesData.sort((a: any, b: any) => a.candidateId - b.candidateId);

      setCandidates(candidatesData);
    } catch (error: any) {
      console.error('Error fetching election:', error);
      setError('Failed to load election data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElectionData();
  }, [program, electionId]);

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h2>
          <p className="text-gray-400">Please connect your wallet</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading election...</p>
        </div>
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400">{error || 'Election not found'}</p>
          <Link href="/admin">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/admin">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Election Header */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-4xl font-bold">{election.title}</h1>
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold ${getElectionStatusColor(
                    election.status
                  )}`}
                >
                  {getElectionStatusLabel(election.status)}
                </span>
              </div>
              {election.description && (
                <p className="text-gray-400 text-lg mb-4">{election.description}</p>
              )}
              <div className="flex items-center gap-6 text-gray-400">
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
          <ElectionLifecycleControls election={election} onStatusChange={fetchElectionData} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Candidates</p>
                <p className="text-3xl font-bold">{election.candidateCount}</p>
              </div>
              <UserPlus className="w-12 h-12 text-purple-400 opacity-50" />
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Votes</p>
                <p className="text-3xl font-bold">{election.totalVotes}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-400 opacity-50" />
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Registration</p>
                <p className="text-xl font-bold">
                  {election.voterRegistrationType?.Open ? 'Open' : 'Whitelist'}
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-400 opacity-50" />
            </div>
          </div>
        </div>

        {/* Candidates Section */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Candidates</h2>
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
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No candidates added yet</p>
              {canModifyElection(election) && (
                <Button onClick={() => setShowAddCandidateModal(true)} variant="outline">
                  Add Your First Candidate
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {candidates.map((candidate) => (
                <div
                  key={candidate.publicKey}
                  className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 hover:border-purple-500/50 transition-colors"
                >
                  {candidate.imageUrl && (
                    <div className="w-full h-48 bg-gray-800 rounded-lg mb-4 overflow-hidden">
                      <img
                        src={candidate.imageUrl}
                        alt={candidate.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <h3 className="text-xl font-bold mb-2">{candidate.name}</h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {candidate.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">ID: {candidate.candidateId}</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="font-bold text-green-400">{candidate.voteCount} votes</span>
                    </div>
                  </div>
                </div>
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
    </div>
  );
}