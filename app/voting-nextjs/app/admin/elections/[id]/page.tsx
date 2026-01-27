'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AddCandidateModal } from '@/components/admin/AddCandidateModal';
import { 
  ArrowLeft, 
  Users, 
  Vote, 
  Activity, 
  Plus,
  RefreshCw,
  Lock,
  AlertCircle
} from 'lucide-react';
import { SUPER_ADMIN, ADMIN_SEED } from '@/lib/constants';

interface Candidate {
  publicKey: string;
  name: string;
  votes: number;
  election: string;
}

interface Election {
  publicKey: string;
  title: string;
  description?: string;
  isActive: boolean;
  totalVotes: number;
  authority: string;
}

export default function ElectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { publicKey } = useWallet();
  const program = useProgram();

  const electionId = params?.id as string;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [closingElection, setClosingElection] = useState(false);

  // Check authorization
  useEffect(() => {
    const checkAuth = async () => {
      if (!publicKey || !program) {
        setAuthorized(false);
        return;
      }

      try {
        // Check if super admin
        if (publicKey.equals(SUPER_ADMIN)) {
          setIsSuperAdmin(true);
          setAuthorized(true);
          return;
        }

        // Check if regular admin
        const [adminPda] = PublicKey.findProgramAddressSync(
          [Buffer.from(ADMIN_SEED), publicKey.toBuffer()],
          program.programId
        );

        // @ts-ignore
        await program.account.admin.fetch(adminPda);
        setAuthorized(true);
        setIsSuperAdmin(false);
      } catch (error) {
        console.error('Authorization check failed:', error);
        setAuthorized(false);
        setTimeout(() => {
          router.push('/admin');
        }, 2000);
      }
    };

    if (mounted && publicKey && program) {
      checkAuth();
    }
  }, [mounted, publicKey, program, router]);

  // Fetch election details
  const fetchElection = async () => {
    if (!program || !electionId) return;

    try {
      const electionPubkey = new PublicKey(electionId);
      
      // @ts-ignore
      const electionAccount = await program.account.election.fetch(electionPubkey);

      setElection({
        publicKey: electionId,
        title: electionAccount.title || 'Untitled Election',
        description: electionAccount.description || '',
        isActive: electionAccount.isActive ?? false,
        totalVotes: electionAccount.totalVotes?.toNumber() || 0,
        authority: electionAccount.authority?.toString() || '',
      });
    } catch (error) {
      console.error('Error fetching election:', error);
    }
  };

  // Fetch candidates
  const fetchCandidates = async () => {
    if (!program || !electionId) return;

    try {
      setLoading(true);
      
      // @ts-ignore
      const candidateAccounts = await program.account.candidate.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: electionId,
          },
        },
      ]);

      const formattedCandidates: Candidate[] = candidateAccounts.map((acc: any) => ({
        publicKey: acc.publicKey.toString(),
        name: acc.account.name || 'Unnamed Candidate',
        votes: acc.account.votes?.toNumber() || 0,
        election: acc.account.election?.toString() || '',
      }));

      // Sort by votes descending
      formattedCandidates.sort((a, b) => b.votes - a.votes);

      setCandidates(formattedCandidates);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Close election
  const handleCloseElection = async () => {
    if (!program || !publicKey || !election) return;

    if (!confirm('Are you sure you want to close this election? This cannot be undone.')) {
      return;
    }

    try {
      setClosingElection(true);

      const electionPubkey = new PublicKey(election.publicKey);

      // @ts-ignore
      const tx = await program.methods
        .closeElection()
        .accountsStrict({
          election: electionPubkey,
          authority: publicKey,
        })
        .rpc();

      console.log('✅ Election closed:', tx);
      
      // Refresh election data
      await fetchElection();
    } catch (error: any) {
      console.error('❌ Error closing election:', error);
      alert('Failed to close election: ' + (error.message || 'Unknown error'));
    } finally {
      setClosingElection(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authorized && program && electionId) {
      fetchElection();
      fetchCandidates();
    }
  }, [authorized, program, electionId]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!publicKey || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-white">Access Denied</h2>
          <p className="text-gray-400 mb-6">
            You must be an admin to access this page.
          </p>
          <Button onClick={() => router.push('/admin')}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <AdminSidebar isSuperAdmin={isSuperAdmin} />

      <main className="ml-64">
        {/* Top Bar */}
        <div className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  {election?.title || 'Loading...'}
                </h1>
                <p className="text-sm text-gray-400">
                  Manage candidates and view results
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3" suppressHydrationWarning>
              <Button
                variant="outline"
                onClick={() => {
                  fetchElection();
                  fetchCandidates();
                }}
                disabled={loading}
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <WalletMultiButton />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Election Info */}
          {election && (
            <Card className="p-6 bg-gray-900 border-gray-800 mb-8">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">{election.title}</h2>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        election.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {election.isActive ? (
                        <>
                          <Activity className="w-3 h-3 inline mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 inline mr-1" />
                          Closed
                        </>
                      )}
                    </span>
                  </div>
                  {election.description && (
                    <p className="text-gray-400 mb-4">{election.description}</p>
                  )}
                  <div className="flex gap-6 text-sm text-gray-400">
                    <span>
                      ID: {election.publicKey.slice(0, 8)}...{election.publicKey.slice(-6)}
                    </span>
                    <span>
                      <Vote className="w-4 h-4 inline mr-1" />
                      {election.totalVotes} total votes
                    </span>
                    <span>
                      <Users className="w-4 h-4 inline mr-1" />
                      {candidates.length} candidates
                    </span>
                  </div>
                </div>
                {election.isActive && publicKey.toString() === election.authority && (
                  <Button
                    variant="outline"
                    onClick={handleCloseElection}
                    disabled={closingElection}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    {closingElection ? (
                      <>
                        <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin mr-2" />
                        Closing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Close Election
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Candidates Section */}
          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Candidates</h2>
              {election?.isActive && (
                <Button onClick={() => setShowAddCandidateModal(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Candidate
                </Button>
              )}
            </div>

            {loading && candidates.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading candidates...</p>
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Candidates Yet</h3>
                <p className="text-gray-400 mb-6">
                  Add candidates to start collecting votes
                </p>
                {election?.isActive && (
                  <Button onClick={() => setShowAddCandidateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Candidate
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((candidate, index) => {
                  const percentage = election
                    ? election.totalVotes > 0
                      ? Math.round((candidate.votes / election.totalVotes) * 100)
                      : 0
                    : 0;

                  return (
                    <Card
                      key={candidate.publicKey}
                      className="p-5 bg-gray-800 border-gray-700 hover:border-purple-500/50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-green-400 flex items-center justify-center text-white font-bold text-lg">
                            #{index + 1}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">{candidate.name}</h3>
                            <p className="text-sm text-gray-400">
                              {candidate.publicKey.slice(0, 8)}...{candidate.publicKey.slice(-6)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-purple-400">
                            {candidate.votes}
                          </div>
                          <div className="text-sm text-gray-400">
                            {percentage}% of votes
                          </div>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-green-400 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Add Candidate Modal */}
      {election && (
        <AddCandidateModal
          open={showAddCandidateModal}
          onClose={() => setShowAddCandidateModal(false)}
          onSuccess={() => {
            setShowAddCandidateModal(false);
            fetchCandidates();
            fetchElection();
          }}
          electionPublicKey={election.publicKey}
        />
      )}
    </div>
  );
}