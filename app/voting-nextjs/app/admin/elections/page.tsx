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
import { ElectionCard } from '@/components/admin/ElectionCard';
import { Plus, Shield, AlertCircle, Calendar, Filter } from 'lucide-react';
import Link from 'next/link';

export default function ElectionsPage() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | ElectionStatus>('all');

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
        hasAdminAccount = adminAccount.isActive;
      } catch (e) {
        hasAdminAccount = false;
      }

      setIsAdmin(isSuperAdminUser || hasAdminAccount);

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
      setElections(electionsData);
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

  const filteredElections = statusFilter === 'all'
    ? elections
    : elections.filter(e => e.status === statusFilter);

  return (
    <AppLayout sidebar={<AdminSidebar isSuperAdmin={isSuperAdmin} />} showFooter={false}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">All Elections</h1>
            <p className="text-gray-400">View and manage all elections</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-500 to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Election
          </Button>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-gray-400" />
          <Button
            onClick={() => setStatusFilter('all')}
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
          >
            All ({elections.length})
          </Button>
          <Button
            onClick={() => setStatusFilter(ElectionStatus.Draft)}
            variant={statusFilter === ElectionStatus.Draft ? 'default' : 'outline'}
            size="sm"
          >
            Draft ({elections.filter(e => e.status === ElectionStatus.Draft).length})
          </Button>
          <Button
            onClick={() => setStatusFilter(ElectionStatus.Active)}
            variant={statusFilter === ElectionStatus.Active ? 'default' : 'outline'}
            size="sm"
          >
            Active ({elections.filter(e => e.status === ElectionStatus.Active).length})
          </Button>
          <Button
            onClick={() => setStatusFilter(ElectionStatus.Ended)}
            variant={statusFilter === ElectionStatus.Ended ? 'default' : 'outline'}
            size="sm"
          >
            Ended ({elections.filter(e => e.status === ElectionStatus.Ended).length})
          </Button>
          <Button
            onClick={() => setStatusFilter(ElectionStatus.Finalized)}
            variant={statusFilter === ElectionStatus.Finalized ? 'default' : 'outline'}
            size="sm"
          >
            Finalized ({elections.filter(e => e.status === ElectionStatus.Finalized).length})
          </Button>
        </div>

        {/* Elections Grid */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400">{error}</p>
            </div>
          ) : filteredElections.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">
                {statusFilter === 'all' ? 'No elections yet' : `No ${statusFilter} elections`}
              </p>
              <Button onClick={() => setShowCreateModal(true)} variant="outline">
                Create Your First Election
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredElections.map((election) => (
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