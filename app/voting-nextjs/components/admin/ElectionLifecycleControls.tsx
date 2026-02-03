'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { getAdminRegistryPda, getAdminPda } from '@/lib/helpers';
import {
  canStartElection,
  canEndElection,
  canCancelElection,
  canFinalizeElection,
} from '@/lib/election-utils';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { AlertCircle, Play, StopCircle, XCircle, CheckCircle, Loader2 } from 'lucide-react';

interface ElectionLifecycleControlsProps {
  election: any;
  onStatusChange: () => void;
}

export function ElectionLifecycleControls({
  election,
  onStatusChange,
}: ElectionLifecycleControlsProps) {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleStartElection = async () => {
    if (!program || !publicKey) return;

    try {
      setLoading('start');
      setError('');

      const electionPubkey = new PublicKey(election.publicKey);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      // @ts-ignore
      const tx = await program.methods
        .startElection()
        .accountsStrict({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          authority: publicKey,
        })
        .rpc();

      logger.transaction('election started', tx, { electionId: election.publicKey });
      onStatusChange();
    } catch (error: any) {
      logger.error('Failed to start election', error, { electionId: election.publicKey });
      setError(error.message || 'Failed to start election');
    } finally {
      setLoading(null);
    }
  };

  const handleEndElection = async () => {
    if (!program || !publicKey) return;

    try {
      setLoading('end');
      setError('');

      const electionPubkey = new PublicKey(election.publicKey);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      // @ts-ignore
      const tx = await program.methods
        .endElection()
        .accountsStrict({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          authority: publicKey,
        })
        .rpc();

      logger.transaction('election ended', tx, { electionId: election.publicKey });
      onStatusChange();
    } catch (error: any) {
      logger.error('Failed to end election', error, { electionId: election.publicKey });
      setError(error.message || 'Failed to end election');
    } finally {
      setLoading(null);
    }
  };

  const handleCancelElection = async () => {
    if (!program || !publicKey) return;
    if (!confirm('Are you sure you want to cancel this election? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading('cancel');
      setError('');

      const electionPubkey = new PublicKey(election.publicKey);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      // @ts-ignore
      const tx = await program.methods
        .cancelElection()
        .accountsStrict({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          authority: publicKey,
        })
        .rpc();

      logger.transaction('election cancelled', tx, { electionId: election.publicKey });
      onStatusChange();
    } catch (error: any) {
      logger.error('Failed to cancel election', error, { electionId: election.publicKey });
      setError(error.message || 'Failed to cancel election');
    } finally {
      setLoading(null);
    }
  };

  const handleFinalizeElection = async () => {
    if (!program || !publicKey) return;

    try {
      setLoading('finalize');
      setError('');

      const electionPubkey = new PublicKey(election.publicKey);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      // @ts-ignore
      const tx = await program.methods
        .finalizeElection()
        .accountsStrict({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          authority: publicKey,
        })
        .rpc();

      logger.transaction('election finalized', tx, { electionId: election.publicKey });
      onStatusChange();
    } catch (error: any) {
      logger.error('Failed to finalize election', error, { electionId: election.publicKey });
      setError(error.message || 'Failed to finalize election');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {canStartElection(election) && (
          <Button
            onClick={handleStartElection}
            disabled={!!loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading === 'start' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Start Election
          </Button>
        )}

        {canEndElection(election) && (
          <Button
            onClick={handleEndElection}
            disabled={!!loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading === 'end' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <StopCircle className="w-4 h-4 mr-2" />
            )}
            End Election
          </Button>
        )}

        {canFinalizeElection(election) && (
          <Button
            onClick={handleFinalizeElection}
            disabled={!!loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading === 'finalize' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Finalize Results
          </Button>
        )}

        {canCancelElection(election) && (
          <Button
            onClick={handleCancelElection}
            disabled={!!loading}
            variant="destructive"
          >
            {loading === 'cancel' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            Cancel Election
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}