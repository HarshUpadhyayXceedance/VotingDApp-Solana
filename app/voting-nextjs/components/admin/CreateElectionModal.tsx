'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { ADMIN_SEED } from '@/lib/constants';
import { VoterRegistrationType, formatVoterRegistrationType } from '@/lib/types';
import { validateElectionTimes } from '@/lib/election-utils';
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
import { AlertCircle, CheckCircle2, Calendar, Clock } from 'lucide-react';

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
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [voterRegistrationType, setVoterRegistrationType] = useState<VoterRegistrationType>(
    VoterRegistrationType.Open
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleCreate = async () => {
    if (!program || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    if (!electionTitle || electionTitle.length > 100) {
      setError('Please enter a valid title (max 100 characters)');
      return;
    }

    if (electionDescription && electionDescription.length > 500) {
      setError('Description too long (max 500 characters)');
      return;
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      setError('Please provide start and end date/time');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Convert date/time to Unix timestamp
      const startTimestamp = Math.floor(
        new Date(`${startDate}T${startTime}`).getTime() / 1000
      );
      const endTimestamp = Math.floor(
        new Date(`${endDate}T${endTime}`).getTime() / 1000
      );

      // Validate times
      const validation = validateElectionTimes(startTimestamp, endTimestamp);
      if (!validation.valid) {
        setError(validation.error || 'Invalid time range');
        setLoading(false);
        return;
      }

      // Convert to BN for Anchor i64
      const startTimeBN = new BN(startTimestamp);
      const endTimeBN = new BN(endTimestamp);

      // Fetch admin registry to get correct election_id
      const [adminRegistryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('admin_registry')],
        program.programId
      );

      // @ts-ignore
      const adminRegistry = await program.account.adminRegistry.fetch(adminRegistryPda);
      const electionId = adminRegistry.adminCount;

      // Derive admin PDA
      const [adminPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(ADMIN_SEED), publicKey.toBuffer()],
        program.programId
      );

      // Derive election PDA using admin_count
      const [electionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('election'), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(electionId)]).buffer))],
        program.programId
      );

      console.log('Creating election...');
      console.log('Admin Registry PDA:', adminRegistryPda.toString());
      console.log('Admin PDA:', adminPda.toString());
      console.log('Election ID:', electionId);
      console.log('Election PDA:', electionPda.toString());
      console.log('Start Time:', startTimestamp);
      console.log('End Time:', endTimestamp);
      console.log('Voter Registration Type:', voterRegistrationType);

      // Create election transaction
      // @ts-ignore
      const tx = await program.methods
        .createElection(
          electionTitle,
          electionDescription || '',
          startTimeBN,  // Pass BN instead of number
          endTimeBN,    // Pass BN instead of number
          formatVoterRegistrationType(voterRegistrationType)
        )
        .accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,  // This is derived from authority (current user)
          election: electionPda,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Election created:', tx);
      setSuccess(true);

      // Reset form
      setTimeout(() => {
        setElectionTitle('');
        setElectionDescription('');
        setStartDate('');
        setStartTime('');
        setEndDate('');
        setEndTime('');
        setVoterRegistrationType(VoterRegistrationType.Open);
        setSuccess(false);
        onSuccess();
      }, 1500);
    } catch (error: any) {
      console.error('❌ Error creating election:', error);

      let errorMsg = 'Failed to create election';

      if (error.message?.includes('AccountNotInitialized') || error.message?.includes('3012')) {
        errorMsg = 'Admin account not initialized. Please contact super admin.';
      } else if (error.message?.includes('Unauthorized')) {
        errorMsg = 'You are not authorized. Make sure you are an admin.';
      } else if (error.message?.includes('InsufficientPermissions')) {
        errorMsg = 'You do not have permission to create elections.';
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
    if (!loading) {
      setElectionTitle('');
      setElectionDescription('');
      setStartDate('');
      setStartTime('');
      setEndDate('');
      setEndTime('');
      setVoterRegistrationType(VoterRegistrationType.Open);
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  // Get min date/time for start (now + 1 hour)
  const minStartDateTime = new Date(Date.now() + 60 * 60 * 1000);
  const minStartDate = minStartDateTime.toISOString().split('T')[0];
  const minStartTime = minStartDateTime.toTimeString().slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">Create New Election</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new election on the Solana blockchain with time-based voting windows.
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
                  maxLength={100}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">{electionTitle.length}/100 characters</p>
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
                  maxLength={500}
                  rows={3}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  {electionDescription.length}/500 characters
                </p>
              </div>

              {/* Start Date/Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Start Date <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={minStartDate}
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-time" className="text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Start Time <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* End Date/Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    End Date <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || minStartDate}
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time" className="text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    End Time <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Voter Registration Type */}
              <div className="space-y-2">
                <Label className="text-white">
                  Voter Registration <span className="text-red-400">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setVoterRegistrationType(VoterRegistrationType.Open)}
                    disabled={loading}
                    className={`p-4 rounded-lg border-2 transition-all ${voterRegistrationType === VoterRegistrationType.Open
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                  >
                    <h4 className="font-bold text-white mb-1">Open</h4>
                    <p className="text-xs text-gray-400">Anyone can vote</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoterRegistrationType(VoterRegistrationType.Whitelist)}
                    disabled={loading}
                    className={`p-4 rounded-lg border-2 transition-all ${voterRegistrationType === VoterRegistrationType.Whitelist
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                  >
                    <h4 className="font-bold text-white mb-1">Whitelist</h4>
                    <p className="text-xs text-gray-400">Only approved voters</p>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Info */}
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-xs text-gray-400">
                  💡 <strong className="text-white">Pro tip:</strong> Elections start in Draft
                  status. You can add candidates before starting the election.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={loading || !electionTitle || !startDate || !startTime || !endDate || !endTime}
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