'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { ADMIN_SEED } from '@/lib/constants';
import { ElectionStatus, parseElectionStatus } from '@/lib/types';
import {
  getElectionStatusLabel,
  getElectionStatusColor,
  formatElectionTime,
} from '@/lib/election-utils';
import { Button } from '@/components/ui/button';
import { CreateElectionModal } from '@/components/admin/CreateElectionModal';
import { InitializeAdminRegistryModal } from '@/components/admin/InitializeAdminRegistryModal';
import { Plus, Shield, AlertCircle, Calendar, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [needsInitialization, setNeedsInitialization] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInitModal, setShowInitModal] = useState(false);

  const fetchData = async () => {
    if (!program || !publicKey) return;

    try {
      setLoading(true);
      setError('');

      // Check if admin registry exists
      const [adminRegistryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('admin_registry')],
        program.programId
      );

      let adminRegistry;
      try {
        // @ts-ignore
        adminRegistry = await program.account.adminRegistry.fetch(adminRegistryPda);
      } catch (e) {
        // Admin registry doesn't exist
        setNeedsInitialization(true);
        setLoading(false);
        return;
      }

      // Check if current user is the super admin
      const isSuperAdmin = publicKey.equals(adminRegistry.superAdmin);

      // Check if current user has an admin account
      const [adminPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(ADMIN_SEED), publicKey.toBuffer()],
        program.programId
      );

      let hasAdminAccount = false;
      try {
        // @ts-ignore
        const adminAccount = await program.account.admin.fetch(adminPda);
        hasAdminAccount = adminAccount.isActive;
      } catch (e) {
        // No admin account
        hasAdminAccount = false;
      }

      // Super admin always has access (even without admin account)
      // Regular admins need an active admin account
      setIsAdmin(isSuperAdmin || hasAdminAccount);

      // If super admin but no admin account, show a message
      if (isSuperAdmin && !hasAdminAccount) {
        setError('You are the super admin but need to create an admin account for yourself. Go to "Manage Admins" and add your own wallet address.');
      }

      // Fetch all elections
      // @ts-ignore
      const electionAccounts = await program.account.election.all();

      const electionsData = electionAccounts.map((account: any) => ({
        publicKey: account.publicKey.toString(),
        ...account.account,
        status: parseElectionStatus(account.account.status),
      }));

      // Sort by election ID (newest first)
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
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h2>
          <p className="text-gray-400">Please connect your wallet to access the admin dashboard</p>
        </div>
      </div>
    );
  }

  if (needsInitialization) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <Shield className="w-20 h-20 text-purple-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Setup Required</h2>
          <p className="text-gray-400 mb-6">
            The admin registry needs to be initialized. Click below to become the super admin.
          </p>
          <Button
            onClick={() => setShowInitModal(true)}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
          >
            <Shield className="w-4 h-4 mr-2" />
            Initialize Admin Registry
          </Button>
        </div>

        <InitializeAdminRegistryModal
          open={showInitModal}
          onClose={() => setShowInitModal(false)}
          onSuccess={fetchData}
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You are not an admin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Manage elections and view statistics</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Election
          </Button>
        </div>

        {/* Warning if super admin without admin account */}
        {error && error.includes('super admin') && (
          <div className="mb-8 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Elections</p>
                <p className="text-3xl font-bold">{elections.length}</p>
              </div>
              <Calendar className="w-12 h-12 text-purple-400 opacity-50" />
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Active Elections</p>
                <p className="text-3xl font-bold">
                  {elections.filter((e) => e.status === ElectionStatus.Active).length}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-400 opacity-50" />
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Votes</p>
                <p className="text-3xl font-bold">
                  {elections.reduce((sum, e) => sum + e.totalVotes, 0)}
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-400 opacity-50" />
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
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No elections yet</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="outline"
                className="mt-4"
              >
                Create Your First Election
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {elections.map((election) => (
                <Link
                  key={election.publicKey}
                  href={`/admin/elections/${election.publicKey}`}
                  className="block p-6 hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{election.title}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getElectionStatusColor(
                            election.status
                          )}`}
                        >
                          {getElectionStatusLabel(election.status)}
                        </span>
                      </div>
                      {election.description && (
                        <p className="text-gray-400 mb-3">{election.description}</p>
                      )}
                      <div className="flex items-center gap-6 text-sm text-gray-400">
                        <span>ID: {election.electionId}</span>
                        <span>Candidates: {election.candidateCount}</span>
                        <span>Votes: {election.totalVotes}</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-400 mt-2">
                        <span>Start: {formatElectionTime(election.startTime)}</span>
                        <span>End: {formatElectionTime(election.endTime)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
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
    </div>
  );
}