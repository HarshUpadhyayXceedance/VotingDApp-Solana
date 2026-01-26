import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
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
      wallet as any, // Wallet adapter type compatibility
      { commitment: 'confirmed' }
    );

    // Cast IDL to Idl type to avoid deep instantiation
    const program = new Program(
      IDL as Idl,
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