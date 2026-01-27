'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { Keypair, SystemProgram, PublicKey } from '@solana/web3.js';
import { ADMIN_SEED } from '@/lib/constants';
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
import { AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';

interface AddCandidateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  electionPublicKey: string;
}

export function AddCandidateModal({ 
  open, 
  onClose, 
  onSuccess,
  electionPublicKey 
}: AddCandidateModalProps) {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [candidateName, setCandidateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleAddCandidate = async () => {
    if (!program || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    if (!candidateName || candidateName.length > 32) {
      setError('Please enter a valid name (max 32 characters)');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Generate candidate keypair
      const candidateKeypair = Keypair.generate();
      const electionPubkey = new PublicKey(electionPublicKey);

      // Derive admin PDA
      const [adminPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(ADMIN_SEED), publicKey.toBuffer()],
        program.programId
      );

      console.log('Adding candidate...');
      console.log('Election:', electionPubkey.toString());
      console.log('Candidate:', candidateKeypair.publicKey.toString());
      console.log('Authority:', publicKey.toString());
      console.log('Admin PDA:', adminPda.toString());

      // Add candidate transaction
      // NOTE: This will work AFTER you deploy the updated smart contract
      // If you haven't deployed the update yet, you'll get a ConstraintHasOne error
      // @ts-ignore
      const tx = await program.methods
        .addCandidate(candidateName)
        .accountsStrict({
          election: electionPubkey,
          candidate: candidateKeypair.publicKey,
          adminAccount: adminPda,  // ✅ Required for updated smart contract
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([candidateKeypair])
        .rpc();

      console.log('✅ Candidate added:', tx);
      setSuccess(true);
      
      // Reset form
      setTimeout(() => {
        setCandidateName('');
        setSuccess(false);
        onSuccess();
      }, 1500);
    } catch (error: any) {
      console.error('❌ Error adding candidate:', error);
      
      let errorMsg = 'Failed to add candidate';
      
      if (error.message?.includes('ConstraintHasOne') || error.message?.includes('2001')) {
        errorMsg = 
          'Only the election creator can add candidates. ' +
          'Switch to the wallet that created this election, or deploy the updated smart contract ' +
          'to allow any admin to add candidates. See FIX_ADMIN_CONSTRAINT.md for details.';
      } else if (error.message?.includes('ElectionClosed')) {
        errorMsg = 'Cannot add candidates to a closed election';
      } else if (error.message?.includes('Unauthorized')) {
        errorMsg = 'You are not authorized. Only admins can add candidates.';
      } else if (error.message?.includes('NameTooLong')) {
        errorMsg = 'Candidate name is too long (max 32 characters)';
      } else if (error.message?.includes('insufficient')) {
        errorMsg = 'Insufficient SOL. Please get more SOL from a faucet.';
      } else if (error.message?.includes('AccountNotInitialized')) {
        errorMsg = 'Admin account not found. Make sure you are registered as an admin.';
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
      setCandidateName('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">Add Candidate</DialogTitle>
          <DialogDescription className="text-gray-400">
            Add a new candidate to this election
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Candidate Added!</h3>
            <p className="text-gray-400">The candidate has been successfully added to the election.</p>
          </div>
        ) : (
          <>
            <div className="space-y-6 py-4">
              {/* Candidate Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">
                  Candidate Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g., Alice Johnson"
                  maxLength={32}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  {candidateName.length}/32 characters
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Info */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-gray-400">
                  💡 <strong className="text-white">Note:</strong> You can add multiple candidates. Each candidate will have their own on-chain account.
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
                onClick={handleAddCandidate}
                disabled={loading || !candidateName}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Candidate
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}