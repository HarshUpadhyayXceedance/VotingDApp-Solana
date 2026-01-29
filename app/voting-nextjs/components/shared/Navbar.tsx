'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Vote, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { SUPER_ADMIN, ADMIN_SEED } from '@/lib/constants';

export function Navbar() {
  const { publicKey, disconnect } = useWallet();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const program = useProgram();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!publicKey || !program) {
        setIsAdmin(false);
        return;
      }

      try {
        // Check if super admin
        if (publicKey.equals(SUPER_ADMIN)) {
          setIsAdmin(true);
          return;
        }

        // Check if admin
        const [adminPda] = PublicKey.findProgramAddressSync(
          [Buffer.from(ADMIN_SEED), publicKey.toBuffer()],
          program.programId
        );
        // @ts-ignore
        await program.account.admin.fetch(adminPda);
        setIsAdmin(true);
      } catch {
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [publicKey, program]);

  const handleDisconnect = async () => {
    await disconnect();
  };

  return (
    <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-3 cursor-pointer hover:-translate-y-0.5 transition-transform">
            <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 to-green-400 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <div className="w-7 h-7 bg-gray-950 rounded-lg flex items-center justify-center">
                <Vote className="w-4 h-4 text-white" />
              </div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-500 to-green-400 bg-clip-text text-transparent hidden sm:block">
              SolVote
            </span>
          </Link>

          {/* Center: Navigation Links */}
          {publicKey && (
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/elections"
                className="text-gray-300 hover:text-purple-400 transition-colors font-medium"
              >
                Elections
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-gray-300 hover:text-purple-400 transition-colors font-medium"
                >
                  Admin
                </Link>
              )}
            </div>
          )}

          {/* Right: Status, Theme Toggle, Wallet */}
          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-400/10 border border-green-400/20 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-400">Devnet</span>
            </div>

            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-10 h-10 flex items-center justify-center bg-gray-900 border border-gray-800 rounded-xl hover:border-purple-500 hover:bg-gray-800 transition-all"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-purple-400" />
                ) : (
                  <Moon className="w-5 h-5 text-purple-400" />
                )}
              </button>
            )}

            {/* Wallet Button or Connected Badge */}
            {publicKey ? (
              <div
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-full hover:border-red-500 cursor-pointer transition-all group"
                title="Click to disconnect"
              >
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-green-400 rounded-full" />
                <span className="text-sm font-mono text-gray-300 group-hover:text-red-400 transition-colors">
                  {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                </span>
              </div>
            ) : (
              <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-purple-600 hover:!from-purple-600 hover:!to-purple-700 !rounded-xl !px-4 !py-2 !h-10 !text-sm !font-semibold !transition-all" />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}