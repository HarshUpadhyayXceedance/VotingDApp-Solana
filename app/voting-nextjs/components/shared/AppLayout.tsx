'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Navbar } from './Navbar';

interface AppLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  showFooter?: boolean;
}

export function AppLayout({ children, sidebar, showFooter = true }: AppLayoutProps) {
  const hasSidebar = !!sidebar;
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black text-gray-900 dark:text-white transition-colors">
      {/* Use consistent Navbar component */}
      <Navbar />

      {/* Sidebar - Below Navbar, Fixed Position */}
      {sidebar}

      {/* Main Content - Dynamic margin based on sidebar width */}
      <main
        className="pt-[84px] transition-all duration-300 min-h-screen"
        style={{
          marginLeft: hasSidebar ? `${sidebarWidth}px` : '0'
        }}
      >
        {children}
      </main>

      {/* Footer - Dynamic margin based on sidebar width */}
      {showFooter && (
        <footer
          className="border-t border-gray-200 dark:border-gray-800 py-6 transition-all duration-300"
          style={{
            marginLeft: hasSidebar ? `${sidebarWidth}px` : '0'
          }}
        >
          <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400 text-sm">
            © {new Date().getFullYear()} SolVote. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
}