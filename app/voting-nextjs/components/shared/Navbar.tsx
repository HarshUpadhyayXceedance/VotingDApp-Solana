'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Vote, Sun, Moon, Menu, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { getAdminRegistryPda, getAdminPda } from '@/lib/helpers';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const { publicKey, disconnect } = useWallet();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const program = useProgram();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user is admin or super admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!publicKey || !program) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        return;
      }

      try {
        const [adminRegistryPda] = getAdminRegistryPda(program.programId);
        
        // Check admin registry
        let adminRegistry;
        try {
          // @ts-ignore
          adminRegistry = await program.account.adminRegistry.fetch(adminRegistryPda);
        } catch (e) {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          return;
        }

        // Check if super admin
        const isSuperAdminUser = publicKey.equals(adminRegistry.superAdmin);
        setIsSuperAdmin(isSuperAdminUser);

        if (isSuperAdminUser) {
          setIsAdmin(true);
          return;
        }

        // Check if regular admin with active account
        const [adminPda] = getAdminPda(publicKey, program.programId);
        try {
          // @ts-ignore
          const adminAccount = await program.account.admin.fetch(adminPda);
          setIsAdmin(adminAccount.isActive);
        } catch {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    };

    checkAdmin();
  }, [publicKey, program]);

  const handleDisconnect = async () => {
    await disconnect();
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 backdrop-blur-xl border-b border-purple-500/20 shadow-lg shadow-purple-500/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-green-400 rounded-2xl blur-md opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-12 h-12 bg-gradient-to-br from-purple-500 to-green-400 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
                <div className="w-9 h-9 bg-gray-950 rounded-xl flex items-center justify-center">
                  <Vote className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="text-2xl font-black bg-gradient-to-r from-purple-400 via-purple-300 to-green-400 bg-clip-text text-transparent">
                SolVote
              </span>
              <div className="text-[10px] text-gray-500 font-medium tracking-wider uppercase -mt-1">
                Decentralized Voting
              </div>
            </div>
          </Link>

          {/* Center: Navigation Links (Desktop) - Smart Button Display */}
          {publicKey && (
            <div className="hidden md:flex items-center gap-2">
              {isAdmin ? (
                // Show Admin button for admin/super admin users
                <Link
                  href="/admin"
                  className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    isActive('/admin') || pathname?.startsWith('/admin/')
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  Admin
                </Link>
              ) : (
                // Show Voter button for regular users
                <Link
                  href="/elections"
                  className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    isActive('/elections') || pathname?.startsWith('/elections/')
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  Voter
                </Link>
              )}
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Connection Status Indicator */}
            {publicKey && (
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-400">
                  {isAdmin ? (isSuperAdmin ? 'Super Admin' : 'Admin') : 'Voter'}
                </span>
              </div>
            )}

            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-11 h-11 flex items-center justify-center bg-gray-800/50 border border-gray-700 rounded-xl hover:border-purple-500 hover:bg-gray-800 transition-all hover:scale-105"
                aria-label="Toggle theme"
                suppressHydrationWarning
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 text-purple-400" />
                )}
              </button>
            )}

            {/* Wallet Button */}
            <div className="hidden sm:block">
              {mounted && (
                <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-purple-600 hover:!from-purple-600 hover:!to-purple-700 !rounded-xl !h-11 !px-5 !font-semibold !text-sm !shadow-lg !shadow-purple-500/30 !transition-all hover:!scale-105" />
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-11 h-11 flex items-center justify-center bg-gray-800/50 border border-gray-700 rounded-xl hover:border-purple-500 transition-all"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800">
            <div className="flex flex-col gap-2">
              {/* Mobile Wallet Button */}
              <div className="sm:hidden mb-2">
                {mounted && (
                  <WalletMultiButton className="!w-full !bg-gradient-to-r !from-purple-500 !to-purple-600 hover:!from-purple-600 hover:!to-purple-700 !rounded-xl !h-11 !px-5 !font-semibold !text-sm !shadow-lg !shadow-purple-500/30" />
                )}
              </div>

              {publicKey && (
                <>
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                        isActive('/admin') || pathname?.startsWith('/admin/')
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800/50'
                      }`}
                    >
                      Admin
                    </Link>
                  ) : (
                    <Link
                      href="/elections"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                        isActive('/elections') || pathname?.startsWith('/elections/')
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800/50'
                      }`}
                    >
                      Voter
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}