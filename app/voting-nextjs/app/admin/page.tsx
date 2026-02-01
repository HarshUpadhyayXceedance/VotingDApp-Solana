'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { getAdminRegistryPda, getAdminPda } from '@/lib/helpers';
import { ElectionStatus, parseElectionStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/shared/AppLayout';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { CreateElectionModal } from '@/components/admin/CreateElectionModal';
import { InitializeAdminRegistryModal } from '@/components/admin/InitializeAdminRegistryModal';
import { ElectionCard } from '@/components/admin/ElectionCard';
import { Plus, Shield, AlertCircle, Calendar, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [allElections, setAllElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [needsInitialization, setNeedsInitialization] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInitModal, setShowInitModal] = useState(false);

  const fetchData = async () => {
    if (!program || !publicKey) return;

    try {
      setLoading(true);
      setError('');

      const [adminRegistryPda] = getAdminRegistryPda(program.programId);

      let adminRegistry;
      try {
        // @ts-ignore
        adminRegistry = await program.account.adminRegistry.fetch(adminRegistryPda);
      } catch (e: any) {
        const msg: string = e?.message || '';
        const isAccountMissing =
          msg.includes('does not exist') ||
          msg.includes('Account not found') ||
          msg.includes('not found') ||
          msg.includes('AccountNotInitialized') ||
          msg.includes('buffer length') ||
          msg.includes('0x0');

        if (isAccountMissing) {
          setNeedsInitialization(true);
          setLoading(false);
          return;
        }

        console.error('Error fetching admin registry:', e);
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

      if (isSuperAdminUser && !hasAdminAccount) {
        setError('You are the super admin but need to create an admin account. Go to "Manage Admins".');
      }

      // @ts-ignore
      const electionAccounts = await program.account.election.all();

      const electionsData = electionAccounts.map((account: any) => ({
        publicKey: account.publicKey.toString(),
        electionId: account.account.electionId.toNumber ? account.account.electionId.toNumber() : account.account.electionId,
        title: account.account.title,
        description: account.account.description,
        startTime: account.account.startTime.toNumber(),
        endTime: account.account.endTime.toNumber(),
        totalVotes: account.account.totalVotes.toString(),
        candidateCount: account.account.candidateCount.toString(),
        status: parseElectionStatus(account.account.status),
      }));

      electionsData.sort((a: any, b: any) => b.electionId - a.electionId);
      setAllElections(electionsData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('Failed to load elections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [program, publicKey]);

  const handleStartElection = async (electionPublicKey: string) => {
    if (!program || !publicKey) return;

    try {
      const electionPubkey = new PublicKey(electionPublicKey);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      // @ts-ignore
      const tx = await program.methods
        .startElection()
        .accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          authority: publicKey,
        })
        .rpc();

      console.log('✅ Election started:', tx);
      fetchData();
    } catch (error: any) {
      console.error('❌ Error starting election:', error);
      alert(error.message || 'Failed to start election');
    }
  };

  const handleEndElection = async (electionPublicKey: string) => {
    if (!program || !publicKey) return;

    try {
      const electionPubkey = new PublicKey(electionPublicKey);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      // @ts-ignore
      const tx = await program.methods
        .endElection()
        .accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          authority: publicKey,
        })
        .rpc();

      console.log('✅ Election ended:', tx);
      fetchData();
    } catch (error: any) {
      console.error('❌ Error ending election:', error);
      alert(error.message || 'Failed to end election');
    }
  };

  const handleFinalizeElection = async (electionPublicKey: string) => {
    if (!program || !publicKey) return;

    try {
      const electionPubkey = new PublicKey(electionPublicKey);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      // @ts-ignore
      const tx = await program.methods
        .finalizeElection()
        .accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          authority: publicKey,
        })
        .rpc();

      console.log('✅ Election finalized:', tx);
      fetchData();
    } catch (error: any) {
      console.error('❌ Error finalizing election:', error);
      alert(error.message || 'Failed to finalize election');
    }
  };

  if (!publicKey) {
    return (
      <AppLayout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h2>
            <p className="text-gray-400">Please connect your wallet</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (needsInitialization) {
    return (
      <AppLayout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <Shield className="w-20 h-20 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">Setup Required</h2>
            <p className="text-gray-400 mb-6">
              The admin registry needs to be initialized.
            </p>
            <Button
              onClick={() => setShowInitModal(true)}
              className="bg-gradient-to-r from-purple-500 to-purple-600"
            >
              <Shield className="w-4 h-4 mr-2" />
              Initialize Registry
            </Button>
          </div>
          <InitializeAdminRegistryModal
            open={showInitModal}
            onClose={() => setShowInitModal(false)}
            onSuccess={fetchData}
          />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">You are not an admin</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Filter only active elections for dashboard
  const activeElections = allElections.filter(e => e.status === ElectionStatus.Active);

  return (
    <AppLayout sidebar={<AdminSidebar isSuperAdmin={isSuperAdmin} />} showFooter={false}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Manage elections and view statistics</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-500 to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Election
          </Button>
        </div>

        {error && error.includes('super admin') && (
          <div className="mb-8 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-yellow-400 mb-2">Action Required</h3>
                <p className="text-gray-300 mb-4">{error}</p>
                <Link href="/admin/manage-admins">
                  <Button className="bg-yellow-600 hover:bg-yellow-700">
                    <Shield className="w-4 h-4 mr-2" />
                    Go to Manage Admins
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Elections</p>
                <p className="text-3xl font-bold">{allElections.length}</p>
              </div>
              <Calendar className="w-12 h-12 text-purple-400 opacity-50" />
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Active Elections</p>
                <p className="text-3xl font-bold">{activeElections.length}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-400 opacity-50" />
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Votes</p>
                <p className="text-3xl font-bold">
                  {allElections.reduce((sum, e) => sum + parseInt(e.totalVotes), 0)}
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-400 opacity-50" />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Active Elections</h2>
            <Link href="/admin/elections">
              <Button variant="outline" size="sm">
                View All Elections
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : activeElections.length === 0 ? (
            <div className="text-center py-16">
              <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No active elections</p>
              <Button onClick={() => setShowCreateModal(true)} variant="outline">
                Create Your First Election
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {activeElections.map((election) => (
                <ElectionCard
                  key={election.publicKey}
                  election={election}
                  onStartElection={handleStartElection}
                  onEndElection={handleEndElection}
                  onFinalizeElection={handleFinalizeElection}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateElectionModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchData}
      />
    </AppLayout>
  );
}