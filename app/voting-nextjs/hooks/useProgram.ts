import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import IDL from '@/public/idl/voting.json';

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (
      !wallet.publicKey ||
      !wallet.signTransaction ||
      !wallet.signAllTransactions
    ) {
      return null;
    }

    // Create provider
    const provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed' }
    );

    const program = new Program(
      IDL as any,
      provider
    );
    
    return program;
  }, [
    connection,
    wallet.publicKey,
    wallet.signTransaction,
    wallet.signAllTransactions,
  ]);
}