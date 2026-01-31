'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Vote, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface AppLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  showFooter?: boolean;
}

export function AppLayout({ children, sidebar, showFooter = true }: AppLayoutProps) {
  const hasSidebar = !!sidebar;
  const [isDark, setIsDark] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Navbar - Full Width, Above Everything */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-2 rounded-lg group-hover:scale-105 transition-transform">
                <Vote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                  SolVote
                </h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Decentralized Voting
                </p>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              <Link
                href="/elections"
                className="text-gray-300 hover:text-white transition-colors font-medium"
              >
                Elections
              </Link>
              <Link
                href="/admin"
                className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
              >
                Admin
              </Link>

              {/* Theme Toggle */}
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                aria-label="Toggle theme"
              >
                <Moon className="w-5 h-5 text-gray-400" />
              </button>

              {/* Wallet Button */}
              <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-purple-600 hover:!from-purple-600 hover:!to-purple-700 !rounded-lg !px-4 !py-2 !font-medium !transition-all" />
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar - Below Navbar */}
      {sidebar && (
        <div className="pt-16">
          {sidebar}
        </div>
      )}

      {/* Main Content */}
      <main
        className={cn(
          'pt-16', // Padding for navbar
          hasSidebar && 'ml-64' // Margin for sidebar
        )}
      >
        {children}
      </main>

      {/* Footer */}
      {showFooter && (
        <footer className={cn(
          'border-t border-gray-800 py-6',
          hasSidebar && 'ml-64'
        )}>
          <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
            © {new Date().getFullYear()} SolVote. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
}