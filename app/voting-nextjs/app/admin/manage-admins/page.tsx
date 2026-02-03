'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getAdminRegistryPda, getAdminPda } from '@/lib/helpers';
import { logger } from '@/lib/logger';
import { SUPER_ADMIN } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AppLayout } from '@/components/shared/AppLayout';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import {
  AlertCircle,
  Shield,
  UserPlus,
  Trash2,
  CheckCircle2,
  Crown,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

export default function ManageAdminsPage() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [admins, setAdmins] = useState<any[]>([]);
  const [adminRegistry, setAdminRegistry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null); // null = checking, false = denied, true = allowed
  const [superAdminHasAccount, setSuperAdminHasAccount] = useState(false);

  // Add admin form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPermissions, setNewAdminPermissions] = useState<any>({
    canManageElections: true,
    canManageCandidates: true,
    canManageVoters: true,
    canFinalizeResults: true,
  });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);

  // Check if super admin account has full permissions
  const [superAdminPermissionsOk, setSuperAdminPermissionsOk] = useState(true);

  const fetchAdmins = async () => {
    if (!program || !publicKey) return;

    try {
      setLoading(true);
      setError('');

      // Fetch admin registry
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);

      // @ts-ignore
      const registry = await program.account.adminRegistry.fetch(adminRegistryPda);
      setAdminRegistry(registry);

      // Check if current user is super admin
      const isSuperAdminUser = publicKey.equals(registry.superAdmin);
      setIsSuperAdmin(isSuperAdminUser);

      // Check if super admin has an admin account and validate permissions
      if (isSuperAdminUser) {
        const [superAdminPda] = getAdminPda(publicKey, program.programId);
        try {
          // @ts-ignore
          const account = await program.account.admin.fetch(superAdminPda);
          setSuperAdminHasAccount(true);

          // Check permissions - use camelCase (Anchor auto-converts from Rust snake_case)
          const p = account.permissions;
          const isOk = p?.canManageElections && p?.canManageCandidates && p?.canManageVoters && p?.canFinalizeResults;
          setSuperAdminPermissionsOk(!!isOk);
        } catch (e) {
          logger.debug('No admin account found for super admin');
          setSuperAdminHasAccount(false);
          setSuperAdminPermissionsOk(false);
        }
      }

      // Fetch all admins
      // @ts-ignore
      const adminAccounts = await program.account.admin.all();

      const adminsData = adminAccounts.map((account: any) => ({
        publicKey: account.publicKey.toString(),
        authority: account.account.authority.toString(),
        name: account.account.name,
        isActive: account.account.is_active ?? account.account.isActive,
        permissions: account.account.permissions,
      }));

      setAdmins(adminsData);
    } catch (error: any) {
      logger.error('Failed to fetch admins', error);
      setError('Failed to load admins. Make sure admin registry is initialized.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [program, publicKey]);

  // Repair admin permissions
  const handleRepairAdmin = async () => {
    if (!program || !publicKey) return;

    try {
      setAdding(true);
      setAddError('');
      setAddSuccess(false);

      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      logger.debug('Repairing admin permissions', { component: 'ManageAdmins' });

      // Use camelCase for JavaScript - Anchor auto-converts to snake_case for Rust
      const fullPermissions = {
        canManageElections: true,
        canManageCandidates: true,
        canManageVoters: true,
        canFinalizeResults: true,
      };

      // @ts-ignore
      const tx = await program.methods
        .updateAdminPermissions(fullPermissions)
        .accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          superAdmin: publicKey,
        })
        .rpc();

      logger.transaction('admin permissions repaired', tx);

      // Wait for blockchain to process and propagate the transaction
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Fetch fresh data from blockchain
      await fetchAdmins();

      setAddSuccess(true);

      // Clear success message after delay
      setTimeout(() => {
        setAddSuccess(false);
      }, 2000);
    } catch (error: any) {
      logger.error('Failed to repair admin permissions', error);
      setAddError(error.message || 'Failed to repair permissions');
    } finally {
      setAdding(false);
    }
  };

  // Add super admin as admin (self)
  const handleAddSelfAsAdmin = async () => {
    if (!program || !publicKey) return;

    // If account exists but permissions are wrong, use repair instead
    if (superAdminHasAccount && !superAdminPermissionsOk) {
      return handleRepairAdmin();
    }

    try {
      setAdding(true);
      setAddError('');
      setAddSuccess(false);

      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      logger.debug('Adding self as admin', { component: 'ManageAdmins' });

      // Use camelCase for JavaScript - Anchor auto-converts to snake_case for Rust
      const fullPermissions = {
        canManageElections: true,
        canManageCandidates: true,
        canManageVoters: true,
        canFinalizeResults: true,
      };

      // @ts-ignore
      const tx = await program.methods
        .addAdmin('Super Admin', fullPermissions)
        .accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          newAdmin: publicKey,
          superAdmin: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      logger.transaction('self added as admin', tx);

      // Wait for blockchain to process and propagate the transaction
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Fetch fresh data from blockchain
      await fetchAdmins();

      setAddSuccess(true);

      // Clear success message after delay
      setTimeout(() => {
        setAddSuccess(false);
      }, 2000);
    } catch (error: any) {
      logger.error('Failed to add self as admin', error);
      setAddError(error.message || 'Failed to add self as admin');
    } finally {
      setAdding(false);
    }
  };

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

      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [newAdminPda] = getAdminPda(newAdminPubkey, program.programId);

      logger.debug('Adding admin', { component: 'ManageAdmins', newAdmin: newAdminAddress });

      // @ts-ignore
      const tx = await program.methods
        .addAdmin(newAdminName, newAdminPermissions)
        .accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: newAdminPda,
          newAdmin: newAdminPubkey,
          superAdmin: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      logger.transaction('admin added', tx);
      setAddSuccess(true);

      setTimeout(() => {
        setNewAdminAddress('');
        setNewAdminName('');
        setNewAdminPermissions({
          canManageElections: true,
          canManageCandidates: true,
          canManageVoters: true,
          canFinalizeResults: true,
        });
        setAddSuccess(false);
        setShowAddForm(false);
        fetchAdmins();
      }, 1500);
    } catch (error: any) {
      logger.error('Failed to add admin', error);

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
    if (!confirm('Are you sure you want to deactivate this admin?')) return;

    try {
      const adminPubkey = new PublicKey(adminAddress);

      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminToRemovePda] = getAdminPda(adminPubkey, program.programId);

      logger.debug('Deactivating admin', { component: 'ManageAdmins', adminAddress });

      // @ts-ignore
      const tx = await program.methods
        .deactivateAdmin()
        .accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: adminToRemovePda,
          superAdmin: publicKey,
        })
        .rpc();

      logger.transaction('admin deactivated', tx);
      fetchAdmins();
    } catch (error: any) {
      logger.error('Failed to deactivate admin', error);
      alert(error.message || 'Failed to deactivate admin');
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

  // Show loading while checking super admin status
  if (isSuperAdmin === null) {
    return (
      <AppLayout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Checking permissions...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show access denied if not super admin
  if (isSuperAdmin === false) {
    return (
      <AppLayout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">Only super admins can manage administrators</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sidebar={<AdminSidebar isSuperAdmin={isSuperAdmin === true} />} showFooter={false}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Manage Admins</h1>
            <p className="text-gray-400">Add or remove system administrators</p>
          </div>
          {isSuperAdmin && (
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-gradient-to-r from-purple-500 to-purple-600"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          )}
        </div>

        {/* Super Admin Warning */}
        {isSuperAdmin && (!superAdminHasAccount || !superAdminPermissionsOk) && !loading && (
          <div className="mb-8 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-yellow-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-yellow-400 mb-2">Action Required</h3>
                <p className="text-gray-300 mb-4">
                  {!superAdminHasAccount
                    ? "You are the super admin but don't have an admin account yet. You must create an admin account for yourself to manage the platform."
                    : "Your admin account is missing required permissions. You need to repair your account to have full access."
                  }
                </p>
                <Button
                  onClick={handleAddSelfAsAdmin}
                  disabled={adding}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {adding ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      {superAdminHasAccount ? 'Repairing Account...' : 'Creating Account...'}
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      {superAdminHasAccount ? 'Repair Admin Permissions' : 'Create My Admin Account'}
                    </>
                  )}
                </Button>
                {addError && (
                  <p className="mt-3 text-sm text-red-400">{addError}</p>
                )}
                {addSuccess && (
                  <p className="mt-3 text-sm text-green-400">
                    {superAdminHasAccount ? '✓ Permissions repaired successfully!' : '✓ Admin account created!'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success message */}
        {isSuperAdmin && superAdminHasAccount && superAdminPermissionsOk && admins.length > 0 && (
          <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span>Your admin account is active. You can now create elections and manage the platform.</span>
              <Link href="/admin" className="ml-auto">
                <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}

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
                    placeholder="Enter wallet address (e.g., 5A7bDg...)"
                    className="bg-gray-800 border-gray-700 text-white font-mono"
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
                  <div className="grid grid-cols-2 gap-3">
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
                        Manage elections
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
                        Manage candidates
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
                        Manage voters
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
                        Finalize results
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
                          {!superAdminHasAccount && isSuperAdmin && (
                            <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
                              No Admin Account
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 font-mono">
                          {String(adminRegistry.superAdmin)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Regular Admins */}
              {admins.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No admin accounts found.</p>
                  {isSuperAdmin && !superAdminHasAccount && (
                    <p className="mt-2 text-sm">Create your admin account first using the button above.</p>
                  )}
                </div>
              ) : (
                admins.map((admin) => (
                  <div key={admin.publicKey} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <Shield className="w-8 h-8 text-purple-400 flex-shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{admin.name}</h3>
                            {admin.isActive ? (
                              <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 font-mono mb-3">
                            {String(admin.authority)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {admin.permissions.canManageElections && (
                              <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                                Elections
                              </span>
                            )}
                            {admin.permissions.canManageCandidates && (
                              <span className="px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
                                Candidates
                              </span>
                            )}
                            {admin.permissions.canManageVoters && (
                              <span className="px-3 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">
                                Voters
                              </span>
                            )}
                            {admin.permissions.canFinalizeResults && (
                              <span className="px-3 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                                Finalize
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isSuperAdmin && admin.isActive && admin.authority !== publicKey?.toString() && (
                        <Button
                          onClick={() => handleRemoveAdmin(admin.authority.toString())}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}