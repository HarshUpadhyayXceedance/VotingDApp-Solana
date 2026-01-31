'use client';

import dynamic from 'next/dynamic';

const ClientWalletProvider = dynamic(
  () =>
    import('./WalletProvider').then(
      (m) => m.WalletContextProvider
    ),
  { ssr: false }
);

export default ClientWalletProvider;
