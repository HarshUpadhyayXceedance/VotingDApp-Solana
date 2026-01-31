'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  showFooter?: boolean;
}

export function AppLayout({ children, sidebar, showFooter = true }: AppLayoutProps) {
  const hasSidebar = !!sidebar;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Sidebar */}
      {sidebar}

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300',
          hasSidebar && 'ml-64' // Fixed margin when sidebar exists
        )}
      >
        {children}
      </main>

      {/* Footer */}
      {showFooter && (
        <footer className={cn(
          'border-t border-gray-800 py-6 transition-all duration-300',
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