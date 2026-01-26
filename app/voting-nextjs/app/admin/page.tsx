'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { SUPER_ADMIN, ADMIN_SEED } from '@/lib/constants';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Vote, Users, Activity, Database, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { CreateElectionModal } from '@/components/admin/CreateElectionModal';

interface Election {
  publicKey: string;
  title: string;
  description?: string;
  isActive: boolean;
  totalVotes: number;
  authority: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const program = useProgram();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [elections, setElections] = useState<Election[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Stats
  const totalElections = elections.length;
  const activeElections = elections.filter(e => e.isActive).length;
  const totalVotes = elections.reduce((sum, e) => sum + e.totalVotes, 0);

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
        // Redirect to elections page if not admin
        setTimeout(() => {
          router.push('/elections');
        }, 2000);
      }
    };

    if (mounted && publicKey && program) {
      checkAuth();
    }
  }, [mounted, publicKey, program, router]);

  // Fetch elections with error handling for legacy elections
  const fetchElections = async () => {
    if (!program || !authorized) return;

    try {
      setLoading(true);
      setFetchError(null);
      
      // @ts-ignore
      const electionAccounts = await program.account.election.all();

      const formattedElections: Election[] = [];
      const failedElections: string[] = [];

      // Process each election individually to handle decode errors
      for (const acc of electionAccounts) {
        try {
          formattedElections.push({
            publicKey: acc.publicKey.toString(),
            title: acc.account.title || 'Untitled Election',
            description: acc.account.description || '',
            isActive: acc.account.isActive ?? false,
            totalVotes: acc.account.totalVotes?.toNumber() || 0,
            authority: acc.account.authority?.toString() || '',
          });
        } catch (err) {
          // Skip elections that can't be decoded (legacy format)
          failedElections.push(acc.publicKey.toString().slice(0, 8));
        }
      }

      setElections(formattedElections);
      
      if (failedElections.length > 0) {
        setFetchError(
          `Found ${failedElections.length} legacy election(s) created with old program. ` +
          `They cannot be displayed but new elections will work fine.`
        );
      }
    } catch (error: any) {
      console.error('Error fetching elections:', error);
      
      // Check if it's a decode error
      if (error.message?.includes('buffer length') || error.message?.includes('decode')) {
        setFetchError(
          'Some elections were created with an older version of the program and cannot be displayed. ' +
          'New elections will work correctly. You may want to close old elections or recreate them.'
        );
      } else {
        setFetchError('Failed to fetch elections. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch elections when authorized
  useEffect(() => {
    if (authorized && program) {
      fetchElections();
    }
  }, [authorized, program]);

  // Loading state
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Not connected
  if (!publicKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-green-400 flex items-center justify-center">
            <Vote className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Admin Dashboard</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to access the admin dashboard
          </p>
          <div suppressHydrationWarning>
            <WalletMultiButton />
          </div>
        </Card>
      </div>
    );
  }

  // Not authorized
  if (!authorized && publicKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <Vote className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Access Denied</h2>
          <p className="text-gray-400 mb-4">
            You are not authorized to access the admin dashboard.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Only registered admins can access this area. Redirecting to elections page...
          </p>
          <Button onClick={() => router.push('/elections')} variant="outline">
            Go to Elections
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <AdminSidebar isSuperAdmin={isSuperAdmin} />

      {/* Main Content */}
      <main className="ml-64 transition-all duration-300">
        {/* Top Bar */}
        <div className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <h1 className="text-2xl font-bold">Dashboard Overview</h1>
              <p className="text-sm text-gray-400">
                {isSuperAdmin ? 'Super Admin Access' : 'Admin Access'}
              </p>
            </div>
            <div className="flex items-center gap-3" suppressHydrationWarning>
              <Button 
                variant="outline" 
                onClick={() => fetchElections()} 
                disabled={loading}
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => setShowCreateModal(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Election
              </Button>
              <WalletMultiButton />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Error Alert */}
          {fetchError && (
            <Card className="p-4 mb-6 bg-yellow-500/10 border-yellow-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-200 font-medium mb-1">Legacy Elections Detected</p>
                  <p className="text-sm text-yellow-300/80">{fetchError}</p>
                  <p className="text-xs text-yellow-400/60 mt-2">
                    💡 Tip: All new elections will work correctly with descriptions.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 bg-gray-900 border-gray-800">
              <div className="flex justify-between items-start mb-4">
                <span className="text-gray-400 text-sm">Total Elections</span>
                <Database className="w-8 h-8 text-purple-500" />
              </div>
              <div className="text-4xl font-bold mb-2">{totalElections}</div>
              <div className="text-sm text-gray-400">On-chain data</div>
            </Card>

            <Card className="p-6 bg-gray-900 border-gray-800">
              <div className="flex justify-between items-start mb-4">
                <span className="text-gray-400 text-sm">Active Now</span>
                <Activity className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-4xl font-bold mb-2">{activeElections}</div>
              <div className="text-sm text-green-400">Live voting</div>
            </Card>

            <Card className="p-6 bg-gray-900 border-gray-800">
              <div className="flex justify-between items-start mb-4">
                <span className="text-gray-400 text-sm">Total Votes</span>
                <Vote className="w-8 h-8 text-blue-500" />
              </div>
              <div className="text-4xl font-bold mb-2">{totalVotes}</div>
              <div className="text-sm text-gray-400">Votes cast</div>
            </Card>

            <Card className="p-6 bg-gray-900 border-gray-800">
              <div className="flex justify-between items-start mb-4">
                <span className="text-gray-400 text-sm">Voters</span>
                <Users className="w-8 h-8 text-orange-500" />
              </div>
              <div className="text-4xl font-bold mb-2">{totalVotes}</div>
              <div className="text-sm text-gray-400">Registered</div>
            </Card>
          </div>

          {/* Elections List */}
          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Elections</h2>
              {elections.length > 0 && (
                <span className="text-sm text-gray-400">
                  {elections.length} total
                </span>
              )}
            </div>

            {loading && elections.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading elections...</p>
              </div>
            ) : elections.length === 0 ? (
              <div className="text-center py-12">
                <Vote className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Elections Yet</h3>
                <p className="text-gray-400 mb-6">
                  Create your first election to get started
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Election
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {elections.map((election) => (
                  <Card
                    key={election.publicKey}
                    className="p-6 bg-gray-800 border-gray-700 hover:border-purple-500 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2">{election.title}</h3>
                        {election.description && (
                          <p className="text-gray-400 text-sm mb-3">
                            {election.description}
                          </p>
                        )}
                        <div className="flex gap-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full ${
                              election.isActive
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
                            {election.isActive ? 'Active' : 'Closed'}
                          </span>
                          <span className="text-gray-400">
                            {election.publicKey.slice(0, 8)}...
                          </span>
                          <span className="text-gray-400">
                            {election.totalVotes} votes
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/elections/${election.publicKey}`)}
                      >
                        Manage
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Create Election Modal */}
      {showCreateModal && (
        <CreateElectionModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            setTimeout(() => fetchElections(), 2000);
          }}
        />
      )}
    </div>
  );
}