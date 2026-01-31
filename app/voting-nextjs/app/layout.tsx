import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientWalletProvider from '@/components/wallet/ClientWalletProvider';
import ClientThemeProvider from '@/components/providers/ClientThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SolVote - Decentralized Voting on Solana',
  description:
    'Experience the future of governance with lightning-fast, transparent, and tamper-proof voting on the Solana blockchain.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientThemeProvider>
          <ClientWalletProvider>
            {children}
          </ClientWalletProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
