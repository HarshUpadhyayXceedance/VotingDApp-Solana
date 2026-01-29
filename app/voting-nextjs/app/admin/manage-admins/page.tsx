'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { ADMIN_SEED } from '@/lib/constants';
import { AdminPermissions, formatAdminPermissions } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertCircle,
  Shield,
  UserPlus,
  Trash2,
  CheckCircle2,
  Crown,
} from 'lucide-react';

export default function ManageAdminsPage() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [admins, setAdmins] = useState<any[]>([]);
  const [adminRegistry, setAdminRegistry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add admin form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPermissions, setNewAdminPermissions] = useState<AdminPermissions>({
    canManageElections: false,
    canManageCandidates: false,
    canManageVoters: false,
    canFinalizeResults: false,
  });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);

  const fetchAdmins = async () => {
    if (!program || !publicKey) return;

    try {
      setLoading(true);
      setError('');

      // Fetch admin registry
      const [adminRegistryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('admin_registry')],
        program.programId
      );

      // @ts-ignore
      const registry = await program.account.adminRegistry.fetch(adminRegistryPda);
      setAdminRegistry(registry);

      // Fetch all admins
      // @ts-ignore
      const adminAccounts = await program.account.admin.all();

      const adminsData = adminAccounts.map((account: any) => ({
        publicKey: account.publicKey.toString(),
        ...account.account,
      }));

      setAdmins(adminsData);
    } catch (error: any) {
      console.error('Error fetching admins:', error);
      setError('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [program, publicKey]);

  const handleAddAdmin = async () => {
    if (!program || !publicKey) return;

    if (!newAdminAddress || !newAdminName) {
      setAddError('Please provide address and name');
      return;
    }

    try {
      setAdding(true);
      setAddError('');

      const newAdminPubkey = new PublicKey(newAdminAddress);

      const [adminRegistryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('admin_registry')],
        program.programId
      );

      const [superAdminPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(ADMIN_SEED), publicKey.toBuffer()],
        program.programId
      );

      const [newAdminPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(ADMIN_SEED), newAdminPubkey.toBuffer()],
        program.programId
      );

      console.log('Adding admin...');
      console.log('New Admin Address:', newAdminAddress);
      console.log('New Admin PDA:', newAdminPda.toString());
      console.log('Name:', newAdminName);
      console.log('Permissions:', newAdminPermissions);

      // @ts-ignore
      const tx = await program.methods
        .addAdmin(newAdminName, formatAdminPermissions(newAdminPermissions))
        .accountsStrict({
          adminRegistry: adminRegistryPda,
          superAdminAccount: superAdminPda,
          newAdminAccount: newAdminPda,
          newAdmin: newAdminPubkey,
          superAdmin: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Admin added:', tx);
      setAddSuccess(true);

      setTimeout(() => {
        setNewAdminAddress('');
        setNewAdminName('');
        setNewAdminPermissions({
          canManageElections: false,
          canManageCandidates: false,
          canManageVoters: false,
          canFinalizeResults: false,
        });
        setAddSuccess(false);
        setShowAddForm(false);
        fetchAdmins();
      }, 1500);
    } catch (error: any) {
      console.error('❌ Error adding admin:', error);

      let errorMsg = 'Failed to add admin';

      if (error.message?.includes('Unauthorized')) {
        errorMsg = 'Only super admin can add admins';
      } else if (error.message?.includes('already in use')) {
        errorMsg = 'This admin already exists';
      } else if (error.message?.includes('InvalidPublicKey')) {
        errorMsg = 'Invalid wallet address';
      } else if (error.message) {
        errorMsg = error.message;
      }

      setAddError(errorMsg);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAdmin = async (adminAddress: string) => {
    if (!program || !publicKey) return;
    if (!confirm('Are you sure you want to remove this admin?')) return;

    try {
      const adminPubkey = new PublicKey(adminAddress);

      const [adminRegistryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('admin_registry')],
        program.programId
      );

      const [superAdminPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(ADMIN_SEED), publicKey.toBuffer()],
        program.programId
      );

      const [adminToRemovePda] = PublicKey.findProgramAddressSync(
        [Buffer.from(ADMIN_SEED), adminPubkey.toBuffer()],
        program.programId
      );

      // @ts-ignore
      const tx = await program.methods
        .removeAdmin()
        .accountsStrict({
          adminRegistry: adminRegistryPda,
          superAdminAccount: superAdminPda,
          adminToRemove: adminToRemovePda,
          superAdmin: publicKey,
        })
        .rpc();

      console.log('✅ Admin removed:', tx);
      fetchAdmins();
    } catch (error: any) {
      console.error('❌ Error removing admin:', error);
      alert(error.message || 'Failed to remove admin');
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Manage Admins</h1>
            <p className="text-gray-400">Add or remove system administrators</p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-purple-500 to-purple-600"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Admin
          </Button>
        </div>

        {/* Add Admin Form */}
        {showAddForm && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6">Add New Admin</h2>

            {addSuccess ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Admin Added!</h3>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-white">
                    Wallet Address <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={newAdminAddress}
                    onChange={(e) => setNewAdminAddress(e.target.value)}
                    placeholder="Enter wallet address"
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={adding}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">
                    Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="Admin name"
                    maxLength={50}
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={adding}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white">Permissions</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="manage-elections"
                        checked={newAdminPermissions.canManageElections}
                        onCheckedChange={(checked) =>
                          setNewAdminPermissions({
                            ...newAdminPermissions,
                            canManageElections: checked as boolean,
                          })
                        }
                      />
                      <label htmlFor="manage-elections" className="text-sm text-gray-300">
                        Can manage elections
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="manage-candidates"
                        checked={newAdminPermissions.canManageCandidates}
                        onCheckedChange={(checked) =>
                          setNewAdminPermissions({
                            ...newAdminPermissions,
                            canManageCandidates: checked as boolean,
                          })
                        }
                      />
                      <label htmlFor="manage-candidates" className="text-sm text-gray-300">
                        Can manage candidates
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="manage-voters"
                        checked={newAdminPermissions.canManageVoters}
                        onCheckedChange={(checked) =>
                          setNewAdminPermissions({
                            ...newAdminPermissions,
                            canManageVoters: checked as boolean,
                          })
                        }
                      />
                      <label htmlFor="manage-voters" className="text-sm text-gray-300">
                        Can manage voters
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="finalize-results"
                        checked={newAdminPermissions.canFinalizeResults}
                        onCheckedChange={(checked) =>
                          setNewAdminPermissions({
                            ...newAdminPermissions,
                            canFinalizeResults: checked as boolean,
                          })
                        }
                      />
                      <label htmlFor="finalize-results" className="text-sm text-gray-300">
                        Can finalize results
                      </label>
                    </div>
                  </div>
                </div>

                {addError && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{addError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowAddForm(false)}
                    variant="outline"
                    disabled={adding}
                    className="border-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddAdmin}
                    disabled={adding || !newAdminAddress || !newAdminName}
                    className="bg-gradient-to-r from-purple-500 to-purple-600"
                  >
                    {adding ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Adding...
                      </>
                    ) : (
                      'Add Admin'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admins List */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold">Administrators</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 mt-4">Loading admins...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400">{error}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {/* Super Admin */}
              {adminRegistry && (
                <div className="p-6 bg-purple-500/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Crown className="w-8 h-8 text-yellow-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">Super Admin</h3>
                          <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                            Full Access
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 font-mono">
                          {adminRegistry.superAdmin.toString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Regular Admins */}
              {admins.map((admin) => (
                <div key={admin.publicKey} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Shield className="w-8 h-8 text-purple-400 flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{admin.name}</h3>
                          {!admin.isActive && (
                            <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 font-mono mb-3">
                          {admin.authority.toString()}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {admin.permissions.can_manage_elections && (
                            <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                              Elections
                            </span>
                          )}
                          {admin.permissions.can_manage_candidates && (
                            <span className="px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
                              Candidates
                            </span>
                          )}
                          {admin.permissions.can_manage_voters && (
                            <span className="px-3 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">
                              Voters
                            </span>
                          )}
                          {admin.permissions.can_finalize_results && (
                            <span className="px-3 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                              Finalize
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRemoveAdmin(admin.authority.toString())}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}