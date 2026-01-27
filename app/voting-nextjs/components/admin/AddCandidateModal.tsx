'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey, SystemProgram } from '@solana/web3.js';
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
import { AlertCircle, CheckCircle2, UserPlus, Image } from 'lucide-react';

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
  const [candidateDescription, setCandidateDescription] = useState('');
  const [candidateImageUrl, setCandidateImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleAddCandidate = async () => {
    if (!program || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    if (!candidateName || candidateName.length > 50) {
      setError('Please enter a valid name (max 50 characters)');
      return;
    }

    if (!candidateDescription || candidateDescription.length > 500) {
      setError('Description is required (max 500 characters)');
      return;
    }

    if (candidateImageUrl && candidateImageUrl.length > 200) {
      setError('Image URL too long (max 200 characters)');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const electionPubkey = new PublicKey(electionPublicKey);

      // Fetch election to get candidate_count
      // @ts-ignore
      const election = await program.account.election.fetch(electionPubkey);
      const candidateId = election.candidateCount;

      // Derive admin registry PDA
      const [adminRegistryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('admin_registry')],
        program.programId
      );

      // Derive admin PDA
      const [adminPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(ADMIN_SEED), publicKey.toBuffer()],
        program.programId
      );

      // Derive candidate PDA
      const [candidatePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('candidate'),
          electionPubkey.toBuffer(),
          Buffer.from(new Uint8Array(new Uint32Array([candidateId]).buffer))
        ],
        program.programId
      );

      console.log('Adding candidate...');
      console.log('Election:', electionPubkey.toString());
      console.log('Candidate ID:', candidateId);
      console.log('Candidate PDA:', candidatePda.toString());

      // @ts-ignore
      const tx = await program.methods
        .addCandidate(
          candidateName, 
          candidateDescription,
          candidateImageUrl || ''
        )
        .accountsStrict({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          candidate: candidatePda,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Candidate added:', tx);
      setSuccess(true);
      
      setTimeout(() => {
        setCandidateName('');
        setCandidateDescription('');
        setCandidateImageUrl('');
        setSuccess(false);
        onSuccess();
      }, 1500);
    } catch (error: any) {
      console.error('❌ Error adding candidate:', error);
      
      let errorMsg = 'Failed to add candidate';
      
      if (error.message?.includes('CannotModifyActiveElection')) {
        errorMsg = 'Cannot add candidates to an active election';
      } else if (error.message?.includes('Unauthorized')) {
        errorMsg = 'You are not authorized';
      } else if (error.message?.includes('InsufficientPermissions')) {
        errorMsg = 'You do not have permission to manage candidates';
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
      setCandidateDescription('');
      setCandidateImageUrl('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800 max-h-[90vh] overflow-y-auto">
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
            <p className="text-gray-400">Successfully added to the election.</p>
          </div>
        ) : (
          <>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">
                  Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g., Alice Johnson"
                  maxLength={50}
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">{candidateName.length}/50</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">
                  Description <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={candidateDescription}
                  onChange={(e) => setCandidateDescription(e.target.value)}
                  placeholder="Candidate background and qualifications..."
                  maxLength={500}
                  rows={4}
                  className="bg-gray-800 border-gray-700 text-white resize-none"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">{candidateDescription.length}/500</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-white flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Image URL <span className="text-gray-500 text-xs">(Optional)</span>
                </Label>
                <Input
                  id="imageUrl"
                  value={candidateImageUrl}
                  onChange={(e) => setCandidateImageUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  maxLength={200}
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">{candidateImageUrl.length}/200</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
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
                disabled={loading || !candidateName || !candidateDescription}
                className="bg-gradient-to-r from-blue-500 to-blue-600"
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