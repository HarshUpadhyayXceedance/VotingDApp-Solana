'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { getAdminRegistryPda, getAdminPda, getVoterRegistrationPda } from '@/lib/helpers';
import { parseElectionStatus, VoterRegistrationType, parseVoterRegistrationType, RegistrationStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLayout } from '@/components/shared/AppLayout';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AddVoterModal } from '@/components/admin/AddVoterModal';
import {
  AlertCircle,
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ElectionVotersPage() {
  const params = useParams();
  const { publicKey } = useWallet();
  const program = useProgram();

  const electionId = params.id as string;

  const [election, setElection] = useState<any>(null);
  const [voters, setVoters] = useState<any[]>([]);
  const [filteredVoters, setFilteredVoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showAddVoterModal, setShowAddVoterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const fetchData = async () => {
    if (!program || !electionId || !publicKey) return;

    try {
      setLoading(true);
      setError('');

      const electionPubkey = new PublicKey(electionId);

      // Check if super admin
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      try {
        // @ts-ignore
        const adminRegistry = await program.account.adminRegistry.fetch(adminRegistryPda);
        if (publicKey) {
          setIsSuperAdmin(publicKey.equals(adminRegistry.superAdmin));
        }
      } catch (e) {
        // Ignore
      }

      // @ts-ignore
      const electionAccount = await program.account.election.fetch(electionPubkey);

      const electionData = {
        publicKey: electionId,
        electionId: electionAccount.electionId?.toNumber 
          ? electionAccount.electionId.toNumber() 
          : Number(electionAccount.electionId),
        title: electionAccount.title,
        description: electionAccount.description,
        startTime: electionAccount.startTime?.toNumber 
          ? electionAccount.startTime.toNumber() 
          : Number(electionAccount.startTime),
        endTime: electionAccount.endTime?.toNumber 
          ? electionAccount.endTime.toNumber() 
          : Number(electionAccount.endTime),
        totalVotes: electionAccount.totalVotes?.toString 
          ? electionAccount.totalVotes.toString() 
          : String(electionAccount.totalVotes),
        candidateCount: electionAccount.candidateCount?.toString 
          ? electionAccount.candidateCount.toString() 
          : String(electionAccount.candidateCount),
        status: parseElectionStatus(electionAccount.status),
        voterRegistrationType: parseVoterRegistrationType(electionAccount.voterRegistrationType),
      };

      setElection(electionData);

      // Fetch voter registrations for whitelist elections
      if (electionData.voterRegistrationType === VoterRegistrationType.Whitelist) {
        // @ts-ignore
        const voterRegs = await program.account.voterRegistration.all([
          {
            memcmp: {
              offset: 8,
              bytes: electionPubkey.toBase58(),
            },
          },
        ]);

        const votersData = voterRegs.map((reg: any) => {
          let status: RegistrationStatus;
          if (reg.account.status.pending !== undefined) status = RegistrationStatus.Pending;
          else if (reg.account.status.approved !== undefined) status = RegistrationStatus.Approved;
          else if (reg.account.status.rejected !== undefined) status = RegistrationStatus.Rejected;
          else if (reg.account.status.revoked !== undefined) status = RegistrationStatus.Revoked;
          else status = RegistrationStatus.Pending;

          return {
            publicKey: reg.publicKey.toString(),
            voter: reg.account.voter.toString(),
            status,
            requestedAt: reg.account.requestedAt?.toNumber 
              ? reg.account.requestedAt.toNumber() 
              : Number(reg.account.requestedAt),
            approvedAt: reg.account.approvedAt
              ? (reg.account.approvedAt.toNumber 
                  ? reg.account.approvedAt.toNumber() 
                  : Number(reg.account.approvedAt))
              : null,
            approvedBy: reg.account.approvedBy?.toString() || null,
          };
        });

        votersData.sort((a: any, b: any) => b.requestedAt - a.requestedAt);
        setVoters(votersData);
        setFilteredVoters(votersData);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('Failed to load election data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [program, electionId, publicKey]);

  useEffect(() => {
    let filtered = voters;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((voter) => {
        if (statusFilter === 'pending') return voter.status === RegistrationStatus.Pending;
        if (statusFilter === 'approved') return voter.status === RegistrationStatus.Approved;
        if (statusFilter === 'rejected') return voter.status === RegistrationStatus.Rejected;
        return true;
      });
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((voter) =>
        voter.voter.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredVoters(filtered);
  }, [statusFilter, searchQuery, voters]);

  const handleApprove = async (voterAddress: string) => {
    if (!program || !publicKey) return;

    try {
      const electionPubkey = new PublicKey(electionId);
      const voterPubkey = new PublicKey(voterAddress);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);
      const [voterRegPda] = getVoterRegistrationPda(electionPubkey, voterPubkey, program.programId);

      // @ts-ignore
      const tx = await program.methods
        .approveVoterRegistration()
        .accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          voterRegistration: voterRegPda,
          authority: publicKey,
        })
        .rpc();

      console.log('✅ Voter approved:', tx);
      fetchData();
    } catch (error: any) {
      console.error('❌ Error approving voter:', error);
      alert(error.message || 'Failed to approve voter');
    }
  };

  const handleReject = async (voterAddress: string) => {
    if (!program || !publicKey) return;

    try {
      const electionPubkey = new PublicKey(electionId);
      const voterPubkey = new PublicKey(voterAddress);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);
      const [voterRegPda] = getVoterRegistrationPda(electionPubkey, voterPubkey, program.programId);

      // @ts-ignore
      const tx = await program.methods
        .rejectVoterRegistration()
        .accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          voterRegistration: voterRegPda,
          authority: publicKey,
        })
        .rpc();

      console.log('✅ Voter rejected:', tx);
      fetchData();
    } catch (error: any) {
      console.error('❌ Error rejecting voter:', error);
      alert(error.message || 'Failed to reject voter');
    }
  };

  const handleRevoke = async (voterAddress: string) => {
    if (!confirm('Are you sure you want to revoke this voter\'s access?')) return;

    if (!program || !publicKey) return;

    try {
      const electionPubkey = new PublicKey(electionId);
      const voterPubkey = new PublicKey(voterAddress);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);
      const [voterRegPda] = getVoterRegistrationPda(electionPubkey, voterPubkey, program.programId);

      // @ts-ignore
      const tx = await program.methods
        .revokeVoterRegistration()
        .accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          voterRegistration: voterRegPda,
          authority: publicKey,
        })
        .rpc();

      console.log('✅ Voter revoked:', tx);
      fetchData();
    } catch (error: any) {
      console.error('❌ Error revoking voter:', error);
      alert(error.message || 'Failed to revoke voter');
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

  if (loading) {
    return (
      <AppLayout sidebar={<AdminSidebar isSuperAdmin={isSuperAdmin} />} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading voter data...</p>
          </div>
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
            <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
            <p className="text-gray-400">{error || 'Election not found'}</p>
            <Link href="/admin/voters">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Voters
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const pendingCount = voters.filter((v) => v.status === RegistrationStatus.Pending).length;
  const approvedCount = voters.filter((v) => v.status === RegistrationStatus.Approved).length;
  const rejectedCount = voters.filter((v) => v.status === RegistrationStatus.Rejected).length;

  return (
    <AppLayout sidebar={<AdminSidebar isSuperAdmin={isSuperAdmin} />} showFooter={false}>
      <div className="container mx-auto px-4 py-8">
        <Link href="/admin/voters">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Voters
          </Button>
        </Link>

        {/* Election Header */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-4xl font-bold">{election.title}</h1>
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                    election.voterRegistrationType === VoterRegistrationType.Whitelist
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {election.voterRegistrationType === VoterRegistrationType.Whitelist
                    ? 'Whitelist Only'
                    : 'Open to All'}
                </span>
              </div>
              {election.description && (
                <p className="text-gray-400 text-lg mb-4">{election.description}</p>
              )}
            </div>
          </div>
        </div>

        {election.voterRegistrationType === VoterRegistrationType.Open ? (
          // Open Election Message
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Open Election</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              This is an open election. Anyone with a wallet can vote without registration or approval.
              Voter management is not required for open elections.
            </p>
          </div>
        ) : (
          // Whitelist Election Management
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Voters</p>
                    <p className="text-3xl font-bold">{voters.length}</p>
                  </div>
                  <Users className="w-12 h-12 text-purple-400 opacity-50" />
                </div>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Pending</p>
                    <p className="text-3xl font-bold">{pendingCount}</p>
                  </div>
                  <Clock className="w-12 h-12 text-yellow-400 opacity-50" />
                </div>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Approved</p>
                    <p className="text-3xl font-bold">{approvedCount}</p>
                  </div>
                  <UserCheck className="w-12 h-12 text-green-400 opacity-50" />
                </div>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Rejected</p>
                    <p className="text-3xl font-bold">{rejectedCount}</p>
                  </div>
                  <UserX className="w-12 h-12 text-red-400 opacity-50" />
                </div>
              </div>
            </div>

            {/* Voters List */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Voter Registrations</h2>
                  <Button
                    onClick={() => setShowAddVoterModal(true)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Add Voter
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by wallet address..."
                        className="pl-10 bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <Button
                      onClick={() => setStatusFilter('all')}
                      variant={statusFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                    >
                      All
                    </Button>
                    <Button
                      onClick={() => setStatusFilter('pending')}
                      variant={statusFilter === 'pending' ? 'default' : 'outline'}
                      size="sm"
                    >
                      Pending
                    </Button>
                    <Button
                      onClick={() => setStatusFilter('approved')}
                      variant={statusFilter === 'approved' ? 'default' : 'outline'}
                      size="sm"
                    >
                      Approved
                    </Button>
                    <Button
                      onClick={() => setStatusFilter('rejected')}
                      variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                      size="sm"
                    >
                      Rejected
                    </Button>
                  </div>
                </div>
              </div>

              {filteredVoters.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">
                    {voters.length === 0
                      ? 'No voter registrations yet'
                      : 'No voters match your filters'}
                  </p>
                  {voters.length === 0 && (
                    <Button onClick={() => setShowAddVoterModal(true)} variant="outline">
                      Add Your First Voter
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {filteredVoters.map((voter) => (
                    <div key={voter.publicKey} className="p-6 hover:bg-gray-800/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="text-sm font-mono text-white truncate">
                              {voter.voter}
                            </p>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                voter.status === RegistrationStatus.Pending
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : voter.status === RegistrationStatus.Approved
                                  ? 'bg-green-500/20 text-green-400'
                                  : voter.status === RegistrationStatus.Rejected
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              {voter.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            Requested: {new Date(voter.requestedAt * 1000).toLocaleString()}
                            {voter.approvedAt && (
                              <> • Approved: {new Date(voter.approvedAt * 1000).toLocaleString()}</>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {voter.status === RegistrationStatus.Pending && (
                            <>
                              <Button
                                onClick={() => handleApprove(voter.voter)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                onClick={() => handleReject(voter.voter)}
                                size="sm"
                                variant="destructive"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                            </>
                          )}
                          {voter.status === RegistrationStatus.Approved && (
                            <Button
                              onClick={() => handleRevoke(voter.voter)}
                              size="sm"
                              variant="destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AddVoterModal
        open={showAddVoterModal}
        onClose={() => setShowAddVoterModal(false)}
        onSuccess={fetchData}
        electionPublicKey={electionId}
      />
    </AppLayout>
  );
}