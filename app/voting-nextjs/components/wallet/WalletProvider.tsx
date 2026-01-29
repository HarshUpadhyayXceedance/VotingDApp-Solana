'use client';

import { ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import default styles (REQUIRED)
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

export function WalletContextProvider({ children }: Props) {
  // ✅ Devnet endpoint
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);

  // ✅ Wallets - empty array allows auto-detection of Standard Wallets (Phantom, etc.)
  const wallets = useMemo(
    () => [],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
