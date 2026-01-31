'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { SUPER_ADMIN } from '@/lib/constants';
import {
  getAdminRegistryPda,
  getAdminPda,
  getElectionPda,
  getCurrentTimestamp,
  VoterRegistrationType,
} from '@/lib/helpers';
import { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, UserPlus, Calendar } from 'lucide-react';

interface CreateElectionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateElectionModal({ open, onClose, onSuccess }: CreateElectionModalProps) {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [electionTitle, setElectionTitle] = useState('');
  const [electionDescription, setElectionDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [voterRegistrationType, setVoterRegistrationType] = useState<'open' | 'whitelist'>('open');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false);
  const [settingUpAdmin, setSettingUpAdmin] = useState(false);
  const [needsRegistryInit, setNeedsRegistryInit] = useState(false);
  const [initializingRegistry, setInitializingRegistry] = useState(false);

  const handleAddSelfAsAdmin = async () => {
    if (!program || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setSettingUpAdmin(true);
      setError('');

      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      console.log('Adding self as admin...');
      console.log('Super Admin:', publicKey.toString());
      console.log('Admin PDA:', adminPda.toString());

      // @ts-ignore
      const tx = await program.methods
        .addAdmin("Super Admin", {
          canManageElections: true,
          canManageCandidates: true,
          canManageVoters: true,
          canFinalizeResults: true,
        })
        .accountsStrict({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          newAdmin: publicKey,
          superAdmin: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Admin added:', tx);
      setNeedsAdminSetup(false);
      setError('');
      
      setTimeout(() => {
        setSettingUpAdmin(false);
      }, 1000);
    } catch (error: any) {
      console.error('❌ Error adding admin:', error);
      setSettingUpAdmin(false);
      
      let errorMsg = 'Failed to add admin account';
      
      if (error.message?.includes('Unauthorized')) {
        errorMsg = 'Only the super admin can add admins. Your address: ' + publicKey.toString();
      } else if (error.message?.includes('already in use')) {
        setNeedsAdminSetup(false);
        setError('');
        return;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
    }
  };

  const handleInitializeRegistry = async () => {
    if (!program || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setInitializingRegistry(true);
      setError('');

      const [adminRegistryPda] = getAdminRegistryPda(program.programId);

      console.log('Initializing admin registry...');
      console.log('Super Admin:', publicKey.toString());
      console.log('Admin Registry PDA:', adminRegistryPda.toString());

      // @ts-ignore
      const tx = await program.methods
        .initializeAdminRegistry()
        .accountsStrict({
          adminRegistry: adminRegistryPda,
          superAdmin: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Admin registry initialized:', tx);
      setNeedsRegistryInit(false);
      setError('');
      
      setTimeout(() => {
        setInitializingRegistry(false);
        // After initializing, we still need to add admin
        setNeedsAdminSetup(true);
      }, 1000);
    } catch (error: any) {
      console.error('❌ Error initializing registry:', error);
      setInitializingRegistry(false);
      
      let errorMsg = 'Failed to initialize admin registry';
      
      if (error.message?.includes('already in use')) {
        setNeedsRegistryInit(false);
        setNeedsAdminSetup(true);
        setError('');
        return;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
    }
  };

  const handleCreate = async () => {
    if (!program || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    // Validation
    if (!electionTitle || electionTitle.length > MAX_TITLE_LENGTH) {
      setError(`Please enter a valid title (max ${MAX_TITLE_LENGTH} characters)`);
      return;
    }

    if (electionDescription && electionDescription.length > MAX_DESCRIPTION_LENGTH) {
      setError(`Description too long (max ${MAX_DESCRIPTION_LENGTH} characters)`);
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select start and end dates');
      return;
    }

    const startTime = new Date(startDate).getTime() / 1000;
    const endTime = new Date(endDate).getTime() / 1000;

    if (endTime <= startTime) {
      setError('End time must be after start time');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setNeedsAdminSetup(false);
      setNeedsRegistryInit(false);

      // Get PDAs
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      console.log('Creating election...');
      console.log('Authority:', publicKey.toString());
      console.log('Admin PDA:', adminPda.toString());
      console.log('Admin Registry PDA:', adminRegistryPda.toString());

      // Check if admin registry exists
      let adminRegistry: any;
      try {
        // @ts-ignore
        adminRegistry = await program.account.adminRegistry.fetch(adminRegistryPda);
        console.log('✅ Admin registry exists, election_count:', adminRegistry.electionCount.toNumber());
      } catch (e) {
        console.log('❌ Admin registry not found');
        setNeedsRegistryInit(true);
        setError('Admin registry not initialized. Click "Initialize Registry" to continue.');
        setLoading(false);
        return;
      }

      // Check if admin account exists
      try {
        // @ts-ignore
        await program.account.admin.fetch(adminPda);
        console.log('✅ Admin account exists');
      } catch (e) {
        console.log('❌ Admin account not found');
        setNeedsAdminSetup(true);
        setError('Admin account not initialized. Click "Setup Admin Account" to continue.');
        setLoading(false);
        return;
      }

      // Get election ID (current election_count)
      const electionId = adminRegistry.electionCount.toNumber();
      const [electionPda] = getElectionPda(electionId, program.programId);

      console.log('Election ID:', electionId);
      console.log('Election PDA:', electionPda.toString());

      // Convert voter registration type to the format expected by Anchor
      const voterRegType = voterRegistrationType === 'open' 
        ? { open: {} } 
        : { whitelist: {} };

      // Create election transaction
      // @ts-ignore
      const tx = await program.methods
        .createElection(
          electionTitle,
          electionDescription || '',
          new BN(Math.floor(startTime)),
          new BN(Math.floor(endTime)),
          voterRegType
        )
        .accountsStrict({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPda,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Election created:', tx);
      console.log('Election PDA:', electionPda.toString());
      
      setSuccess(true);
      
      // Reset form
      setTimeout(() => {
        setElectionTitle('');
        setElectionDescription('');
        setStartDate('');
        setEndDate('');
        setVoterRegistrationType('open');
        setSuccess(false);
        onSuccess();
      }, 1500);
    } catch (error: any) {
      console.error('❌ Error creating election:', error);
      
      let errorMsg = 'Failed to create election';
      
      if (error.message?.includes('AccountNotInitialized') || error.message?.includes('3012')) {
        setNeedsRegistryInit(true);
        errorMsg = 'Admin registry not initialized. Click "Initialize Registry" below.';
      } else if (error.message?.includes('AdminNotActive')) {
        setNeedsAdminSetup(true);
        errorMsg = 'Admin account not found. Click "Setup Admin Account" below.';
      } else if (error.message?.includes('Unauthorized')) {
        errorMsg = 'You are not authorized. Make sure you are an admin.';
      } else if (error.message?.includes('insufficient')) {
        errorMsg = 'Insufficient SOL. Please get more SOL from a faucet.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !settingUpAdmin && !initializingRegistry) {
      setElectionTitle('');
      setElectionDescription('');
      setStartDate('');
      setEndDate('');
      setVoterRegistrationType('open');
      setError('');
      setSuccess(false);
      setNeedsAdminSetup(false);
      setNeedsRegistryInit(false);
      onClose();
    }
  };

  const isSuperAdmin = publicKey?.equals(SUPER_ADMIN);

  // Set default dates (today to 7 days from now)
  const getDefaultDates = () => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return {
      start: now.toISOString().slice(0, 16),
      end: weekFromNow.toISOString().slice(0, 16),
    };
  };

  if (!startDate && !endDate && open) {
    const defaults = getDefaultDates();
    setStartDate(defaults.start);
    setEndDate(defaults.end);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">Create New Election</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new election on the Solana blockchain with all details.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Election Created!</h3>
            <p className="text-gray-400">Your election has been successfully created on-chain.</p>
          </div>
        ) : (
          <>
            <div className="space-y-6 py-4">
              {/* Title Field */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white">
                  Election Title <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="title"
                  value={electionTitle}
                  onChange={(e) => setElectionTitle(e.target.value)}
                  placeholder="e.g., Student Council Election 2024"
                  maxLength={MAX_TITLE_LENGTH}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  disabled={loading || settingUpAdmin || initializingRegistry}
                />
                <p className="text-xs text-gray-500">
                  {electionTitle.length}/{MAX_TITLE_LENGTH} characters
                </p>
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">
                  Description <span className="text-gray-500 text-xs">(Optional)</span>
                </Label>
                <Textarea
                  id="description"
                  value={electionDescription}
                  onChange={(e) => setElectionDescription(e.target.value)}
                  placeholder="Provide a brief description of what this election is about..."
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  rows={4}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                  disabled={loading || settingUpAdmin || initializingRegistry}
                />
                <p className="text-xs text-gray-500">
                  {electionDescription.length}/{MAX_DESCRIPTION_LENGTH} characters
                </p>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Start Date & Time <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={loading || settingUpAdmin || initializingRegistry}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  End Date & Time <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={loading || settingUpAdmin || initializingRegistry}
                />
              </div>

              {/* Voter Registration Type */}
              <div className="space-y-2">
                <Label className="text-white">
                  Voter Registration Type <span className="text-red-400">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setVoterRegistrationType('open')}
                    disabled={loading || settingUpAdmin || initializingRegistry}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      voterRegistrationType === 'open'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-white font-bold mb-1">Open</div>
                    <div className="text-xs text-gray-400">Anyone can vote</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoterRegistrationType('whitelist')}
                    disabled={loading || settingUpAdmin || initializingRegistry}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      voterRegistrationType === 'whitelist'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-white font-bold mb-1">Whitelist</div>
                    <div className="text-xs text-gray-400">Approved voters only</div>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-400">{error}</p>
                    
                    {/* Initialize Registry Button */}
                    {needsRegistryInit && isSuperAdmin && (
                      <Button
                        onClick={handleInitializeRegistry}
                        disabled={initializingRegistry}
                        className="mt-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                        size="sm"
                      >
                        {initializingRegistry ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Initializing...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Initialize Registry
                          </>
                        )}
                      </Button>
                    )}

                    {/* Setup Admin Button */}
                    {needsAdminSetup && isSuperAdmin && !needsRegistryInit && (
                      <Button
                        onClick={handleAddSelfAsAdmin}
                        disabled={settingUpAdmin}
                        className="mt-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                        size="sm"
                      >
                        {settingUpAdmin ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Setting up...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Setup Admin Account
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-xs text-gray-400">
                  💡 <strong className="text-white">Note:</strong> Elections start in Draft status. Add candidates first, then start the election manually.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading || settingUpAdmin || initializingRegistry}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={loading || settingUpAdmin || initializingRegistry || !electionTitle || !startDate || !endDate}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Election'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}