'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { SUPER_ADMIN, ADMIN_SEED } from '@/lib/constants';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus, Shield, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Admin {
  publicKey: string;
  authority: string;
}

export default function ManageAdminsPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const program = useProgram();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if user is super admin
  useEffect(() => {
    if (mounted && publicKey && !publicKey.equals(SUPER_ADMIN)) {
      router.push('/admin');
    }
  }, [mounted, publicKey, router]);

  // Fetch all admins
  const fetchAdmins = async () => {
    if (!program) return;

    try {
      setLoading(true);
      // @ts-ignore
      const adminAccounts = await program.account.admin.all();

      const formattedAdmins: Admin[] = adminAccounts.map((acc: any) => ({
        publicKey: acc.publicKey.toString(),
        authority: acc.account.authority.toString(),
      }));

      setAdmins(formattedAdmins);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add new admin
  const handleAddAdmin = async () => {
    if (!program || !publicKey) return;

    setError('');
    setSuccess('');

    // Validate address
    let adminPubkey: PublicKey;
    try {
      adminPubkey = new PublicKey(newAdminAddress);
    } catch (e) {
      setError('Invalid Solana address');
      return;
    }

    try {
      setLoading(true);

      // Derive admin PDA
      const [adminPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(ADMIN_SEED), adminPubkey.toBuffer()],
        program.programId
      );

      // Add admin
      const tx = await program.methods
        .addAdmin()
        .accounts({
          superAdmin: publicKey,
          admin: adminPubkey,
          adminAccount: adminPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Admin added:', tx);
      setSuccess(`Successfully added admin: ${newAdminAddress}`);
      setNewAdminAddress('');
      
      // Refresh admin list
      setTimeout(() => {
        fetchAdmins();
        setShowAddModal(false);
        setSuccess('');
      }, 2000);
    } catch (error: any) {
      console.error('❌ Error adding admin:', error);
      
      let errorMsg = 'Failed to add admin';
      if (error.message?.includes('already in use')) {
        errorMsg = 'This address is already an admin';
      } else if (error.message?.includes('Unauthorized')) {
        errorMsg = 'Only the super admin can add admins';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && program && publicKey?.equals(SUPER_ADMIN)) {
      fetchAdmins();
    }
  }, [mounted, program, publicKey]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!publicKey || !publicKey.equals(SUPER_ADMIN)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Card className="p-8 text-center max-w-md">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-white">Super Admin Only</h2>
          <p className="text-gray-400 mb-6">
            This page is only accessible to the super admin.
          </p>
          <Button onClick={() => router.push('/admin')}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <AdminSidebar isSuperAdmin={true} />

      <main className="ml-64">
        {/* Top Bar */}
        <div className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <h1 className="text-2xl font-bold">Manage Admins</h1>
              <p className="text-sm text-gray-400">
                Add or remove administrators for the voting system
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Super Admin Info */}
          <Card className="p-6 bg-gradient-to-r from-purple-500/10 to-green-400/10 border-purple-500/20 mb-6">
            <div className="flex items-center gap-4">
              <Shield className="w-12 h-12 text-purple-400" />
              <div>
                <h3 className="text-lg font-bold text-white">Super Admin</h3>
                <p className="text-sm text-gray-300 font-mono">
                  {SUPER_ADMIN.toString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  You have full control over admin management
                </p>
              </div>
            </div>
          </Card>

          {/* Admins List */}
          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Administrators ({admins.length})</h2>
            </div>

            {admins.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Admins Yet</h3>
                <p className="text-gray-400 mb-6">
                  Add administrators to help manage elections
                </p>
                <Button onClick={() => setShowAddModal(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add First Admin
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <Card
                    key={admin.publicKey}
                    className="p-4 bg-gray-800 border-gray-700 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-green-400 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-mono text-sm text-white">
                          {admin.authority}
                        </div>
                        <div className="text-xs text-gray-400">
                          PDA: {admin.publicKey.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
                        Active
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>

          {/* Info Box */}
          <Card className="p-4 bg-blue-500/10 border-blue-500/20 mt-6">
            <p className="text-sm text-gray-300">
              💡 <strong>Note:</strong> Admins can create and manage elections, add candidates, and close elections. Only the super admin can add or remove other admins.
            </p>
          </Card>
        </div>
      </main>

      {/* Add Admin Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">Add New Admin</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the Solana wallet address of the user you want to add as an admin.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Admin Added!</h3>
              <p className="text-gray-400">{success}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-white">
                    Wallet Address <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="address"
                    value={newAdminAddress}
                    onChange={(e) => setNewAdminAddress(e.target.value)}
                    placeholder="e.g., FhU7LwHToCLfhHTP9hEC1BUKW25X76t52oxEs55FwYJq"
                    className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    Enter a valid Solana public key (base58)
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-xs text-gray-300">
                    ⚠️ <strong>Warning:</strong> Make sure you trust this address. Admins have significant control over the voting system.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={loading}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddAdmin}
                  disabled={loading || !newAdminAddress}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Admin
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}