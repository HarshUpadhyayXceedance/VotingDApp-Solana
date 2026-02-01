'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { getAdminRegistryPda, getAdminPda } from '@/lib/helpers';
import { parseElectionStatus, VoterRegistrationType, parseVoterRegistrationType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/shared/AppLayout';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AlertCircle, Users, UserCheck, UserX, Clock } from 'lucide-react';
import Link from 'next/link';

export default function VotersPage() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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
        hasAdminAccount = adminAccount.isActive && adminAccount.permissions.can_manage_voters;
      } catch (e) {
        hasAdminAccount = false;
      }

      setIsAdmin(isSuperAdminUser || hasAdminAccount);

      // @ts-ignore
      const electionAccounts = await program.account.election.all();

      const electionsData = await Promise.all(
        electionAccounts.map(async (account: any) => {
          const electionPubkey = account.publicKey;
          
          // Fetch voter registrations for this election
          let registrations = [];
          try {
            // @ts-ignore
            const voterRegs = await program.account.voterRegistration.all([
              {
                memcmp: {
                  offset: 8,
                  bytes: electionPubkey.toBase58(),
                },
              },
            ]);
            registrations = voterRegs;
          } catch (e) {
            console.error('Error fetching registrations:', e);
          }

          return {
            publicKey: account.publicKey.toString(),
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
            status: parseElectionStatus(account.account.status),
            voterRegistrationType: parseVoterRegistrationType(account.account.voterRegistrationType),
            registrationsCount: registrations.length,
            pendingCount: registrations.filter((r: any) => 
              r.account.status.pending !== undefined
            ).length,
          };
        })
      );

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
            <p className="text-gray-400">You don't have permission to manage voters</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sidebar={<AdminSidebar isSuperAdmin={isSuperAdmin} />} showFooter={false}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Voter Management</h1>
          <p className="text-gray-400">
            Manage voter registrations and permissions for elections
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Elections</p>
                <p className="text-3xl font-bold">{elections.length}</p>
              </div>
              <Users className="w-12 h-12 text-purple-400 opacity-50" />
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Whitelist Elections</p>
                <p className="text-3xl font-bold">
                  {elections.filter(e => e.voterRegistrationType === VoterRegistrationType.Whitelist).length}
                </p>
              </div>
              <UserCheck className="w-12 h-12 text-blue-400 opacity-50" />
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Pending Requests</p>
                <p className="text-3xl font-bold">
                  {elections.reduce((sum, e) => sum + e.pendingCount, 0)}
                </p>
              </div>
              <Clock className="w-12 h-12 text-yellow-400 opacity-50" />
            </div>
          </div>
        </div>

        {/* Elections List */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold">Elections</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 mt-4">Loading elections...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400">{error}</p>
            </div>
          ) : elections.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No elections found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {elections.map((election) => (
                <div key={election.publicKey} className="p-6 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{election.title}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            election.voterRegistrationType === VoterRegistrationType.Whitelist
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}
                        >
                          {election.voterRegistrationType === VoterRegistrationType.Whitelist
                            ? 'Whitelist'
                            : 'Open'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{election.registrationsCount} Registered</span>
                        </div>
                        {election.voterRegistrationType === VoterRegistrationType.Whitelist && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400">
                              {election.pendingCount} Pending
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4" />
                          <span>{election.totalVotes} Votes Cast</span>
                        </div>
                      </div>
                    </div>

                    <Link href={`/admin/voters/${election.publicKey}`}>
                      <Button
                        variant="outline"
                        className="border-gray-600 hover:border-purple-500"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Manage Voters
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}