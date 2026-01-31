'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Vote, Moon } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  showFooter?: boolean;
}

export function AppLayout({ children, sidebar, showFooter = true }: AppLayoutProps) {
  const hasSidebar = !!sidebar;
  const [isDark, setIsDark] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default: 256px (w-64)

  useEffect(() => {
    // Listen for sidebar width changes via custom event
    const handleSidebarResize = (e: CustomEvent) => {
      setSidebarWidth(e.detail.width);
    };

    window.addEventListener('sidebarResize' as any, handleSidebarResize);
    return () => window.removeEventListener('sidebarResize' as any, handleSidebarResize);
  }, []);

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

      {/* Sidebar - Below Navbar, Fixed Position */}
      {sidebar}

      {/* Main Content - Dynamic margin based on sidebar width */}
      <main
        className="pt-16 transition-all duration-300 min-h-screen"
        style={{
          marginLeft: hasSidebar ? `${sidebarWidth}px` : '0'
        }}
      >
        {children}
      </main>

      {/* Footer - Dynamic margin based on sidebar width */}
      {showFooter && (
        <footer 
          className="border-t border-gray-800 py-6 transition-all duration-300"
          style={{
            marginLeft: hasSidebar ? `${sidebarWidth}px` : '0'
          }}
        >
          <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
            © {new Date().getFullYear()} SolVote. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
}