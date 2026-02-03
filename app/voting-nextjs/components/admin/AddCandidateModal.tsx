'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  getAdminRegistryPda,
  getAdminPda,
  getCandidatePda
} from '@/lib/helpers';
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_IMAGE_URL_LENGTH } from '@/lib/constants';
import { logger } from '@/lib/logger';
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

    // Validation
    if (!candidateName || candidateName.length > MAX_NAME_LENGTH) {
      setError(`Please enter a valid name (max ${MAX_NAME_LENGTH} characters)`);
      return;
    }

    if (candidateDescription && candidateDescription.length > MAX_DESCRIPTION_LENGTH) {
      setError(`Description too long (max ${MAX_DESCRIPTION_LENGTH} characters)`);
      return;
    }

    if (candidateImageUrl && candidateImageUrl.length > MAX_IMAGE_URL_LENGTH) {
      setError(`Image URL too long (max ${MAX_IMAGE_URL_LENGTH} characters)`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const electionPubkey = new PublicKey(electionPublicKey);

      // Get PDAs
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      logger.debug('Adding candidate', {
        component: 'AddCandidateModal',
        electionId: electionPubkey.toString(),
      });

      // Fetch election to get candidate_count
      // @ts-ignore
      const electionAccount = await program.account.election.fetch(electionPubkey);
      const candidateId = electionAccount.candidateCount;

      // Derive candidate PDA
      const [candidatePda] = getCandidatePda(
        electionPubkey,
        candidateId,
        program.programId
      );

      // Add candidate transaction
      // @ts-ignore
      const tx = await program.methods
        .addCandidate(
          candidateName,
          candidateDescription || '',
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

      logger.transaction('candidate added', tx, { electionId: electionPublicKey });
      
      setSuccess(true);
      
      // Reset form
      setTimeout(() => {
        setCandidateName('');
        setCandidateDescription('');
        setCandidateImageUrl('');
        setSuccess(false);
        onSuccess();
      }, 1500);
    } catch (error: any) {
      logger.error('Failed to add candidate', error, { component: 'AddCandidateModal' });
      
      let errorMsg = 'Failed to add candidate';
      
      if (error.message?.includes('CannotModifyActiveElection')) {
        errorMsg = 'Cannot add candidates to an active or closed election. Election must be in Draft status.';
      } else if (error.message?.includes('InsufficientPermissions')) {
        errorMsg = 'You do not have permission to manage candidates.';
      } else if (error.message?.includes('AdminNotActive')) {
        errorMsg = 'Your admin account is not active.';
      } else if (error.message?.includes('NameTooLong')) {
        errorMsg = `Candidate name is too long (max ${MAX_NAME_LENGTH} characters)`;
      } else if (error.message?.includes('DescriptionTooLong')) {
        errorMsg = `Description is too long (max ${MAX_DESCRIPTION_LENGTH} characters)`;
      } else if (error.message?.includes('ImageUrlTooLong')) {
        errorMsg = `Image URL is too long (max ${MAX_IMAGE_URL_LENGTH} characters)`;
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
                  maxLength={MAX_NAME_LENGTH}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  {candidateName.length}/{MAX_NAME_LENGTH} characters
                </p>
              </div>

              {/* Candidate Description Field */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">
                  Description <span className="text-gray-500 text-xs">(Optional)</span>
                </Label>
                <Textarea
                  id="description"
                  value={candidateDescription}
                  onChange={(e) => setCandidateDescription(e.target.value)}
                  placeholder="Provide details about the candidate's background, qualifications, or platform..."
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  rows={4}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  {candidateDescription.length}/{MAX_DESCRIPTION_LENGTH} characters
                </p>
              </div>

              {/* Image URL Field */}
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-white">
                  Image URL <span className="text-gray-500 text-xs">(Optional)</span>
                </Label>
                <Input
                  id="imageUrl"
                  value={candidateImageUrl}
                  onChange={(e) => setCandidateImageUrl(e.target.value)}
                  placeholder="https://example.com/candidate-photo.jpg"
                  maxLength={MAX_IMAGE_URL_LENGTH}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  {candidateImageUrl.length}/{MAX_IMAGE_URL_LENGTH} characters
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
                  💡 <strong className="text-white">Note:</strong> Candidates can only be added to elections in Draft status. Each candidate will have their own on-chain account.
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