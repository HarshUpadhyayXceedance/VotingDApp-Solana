import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import idl from '@/public/idl/voting.json';
import { PROGRAM_ID } from '@/lib/constants';

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

    // ✅ Explicit browser wallet (NOT NodeWallet)
    const anchorWallet: Wallet = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    };

    const provider = new AnchorProvider(
      connection,
      anchorWallet,
      { commitment: 'confirmed' }
    );

    return new Program(
      idl as any,
      PROGRAM_ID,
      provider
    );
  }, [
    connection,
    wallet.publicKey,
    wallet.signTransaction,
    wallet.signAllTransactions,
  ]);
}
