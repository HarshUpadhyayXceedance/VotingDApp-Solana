'use client';

import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useProgram } from './useProgram';
import { getAdminRegistryPda, getAdminPda } from '@/lib/helpers';
import { logger, getErrorMessage } from '@/lib/logger';

export type ElectionAction = 'start' | 'end' | 'cancel' | 'finalize';

interface UseElectionActionsResult {
  startElection: (electionPublicKey: string) => Promise<string | null>;
  endElection: (electionPublicKey: string) => Promise<string | null>;
  cancelElection: (electionPublicKey: string) => Promise<string | null>;
  finalizeElection: (electionPublicKey: string) => Promise<string | null>;
  isReady: boolean;
}

/**
 * Shared hook for election lifecycle actions
 * Reduces code duplication across admin pages
 */
export function useElectionActions(): UseElectionActionsResult {
  const { publicKey } = useWallet();
  const program = useProgram();

  const isReady = Boolean(program && publicKey);

  const executeAction = useCallback(
    async (
      action: ElectionAction,
      electionPublicKey: string,
      methodName: 'startElection' | 'endElection' | 'cancelElection' | 'finalizeElection'
    ): Promise<string | null> => {
      if (!program || !publicKey) {
        logger.warn('Cannot execute election action: wallet not connected');
        return null;
      }

      try {
        const electionPubkey = new PublicKey(electionPublicKey);
        const [adminRegistryPda] = getAdminRegistryPda(program.programId);
        const [adminPda] = getAdminPda(publicKey, program.programId);

        // @ts-ignore - Anchor types
        const tx = await program.methods[methodName]()
          .accounts({
            adminRegistry: adminRegistryPda,
            adminAccount: adminPda,
            election: electionPubkey,
            authority: publicKey,
          })
          .rpc();

        logger.transaction(action, tx, { electionId: electionPublicKey });
        return tx;
      } catch (error) {
        logger.error(`Failed to ${action} election`, error, { electionId: electionPublicKey });
        throw new Error(getErrorMessage(error));
      }
    },
    [program, publicKey]
  );

  const startElection = useCallback(
    (electionPublicKey: string) => executeAction('start', electionPublicKey, 'startElection'),
    [executeAction]
  );

  const endElection = useCallback(
    (electionPublicKey: string) => executeAction('end', electionPublicKey, 'endElection'),
    [executeAction]
  );

  const cancelElection = useCallback(
    (electionPublicKey: string) => executeAction('cancel', electionPublicKey, 'cancelElection'),
    [executeAction]
  );

  const finalizeElection = useCallback(
    (electionPublicKey: string) => executeAction('finalize', electionPublicKey, 'finalizeElection'),
    [executeAction]
  );

  return {
    startElection,
    endElection,
    cancelElection,
    finalizeElection,
    isReady,
  };
}
