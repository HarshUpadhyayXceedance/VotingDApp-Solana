import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientWalletProvider from '@/components/wallet/ClientWalletProvider';
import ClientThemeProvider from '@/components/providers/ClientThemeProvider';
export const dynamic = 'force-dynamic';
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SolVote',
  description: 'Decentralized voting on Solana',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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