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
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleCreate = async () => {
    if (!program || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    if (!electionTitle || electionTitle.length > 64) {
      setError('Please enter a valid title (max 64 characters)');
      return;
    }

    if (electionDescription && electionDescription.length > 200) {
      setError('Description too long (max 200 characters)');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Generate election keypair
      const electionKeypair = Keypair.generate();

      // Derive admin PDA
      const [adminPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(ADMIN_SEED), publicKey.toBuffer()],
        program.programId
      );

      // Create election transaction
      // @ts-ignore - Anchor program typing issue
      const tx = await program.methods
        .createElection(electionTitle, electionDescription || '')
        .accountsStrict({
          authority: publicKey,
          adminAccount: adminPda,
          election: electionKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([electionKeypair])
        .rpc();

      console.log('✅ Election created:', tx);
      setSuccess(true);
      
      // Reset form
      setTimeout(() => {
        setElectionTitle('');
        setElectionDescription('');
        setSuccess(false);
        onSuccess();
      }, 1500);
    } catch (error: any) {
      console.error('❌ Error creating election:', error);
      
      let errorMsg = 'Failed to create election';
      
      if (error.message?.includes('Unauthorized')) {
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
    if (!loading) {
      setElectionTitle('');
      setElectionDescription('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">Create New Election</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new election on the Solana blockchain. This will require a small transaction fee.
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
                  maxLength={64}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  {electionTitle.length}/64 characters
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
                  maxLength={200}
                  rows={4}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  {electionDescription.length}/200 characters
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
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-xs text-gray-400">
                  💡 <strong className="text-white">Pro tip:</strong> Once created, you can add candidates and configure voting settings.
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
                disabled={loading || !electionTitle}
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