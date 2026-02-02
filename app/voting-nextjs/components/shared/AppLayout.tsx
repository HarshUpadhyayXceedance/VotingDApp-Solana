'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Navbar } from './Navbar';
import { ParticlesBackground } from './ParticlesBackground';
import { AnimatedBackground } from './AnimatedBackground';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-white transition-colors overflow-x-hidden">
      {/* Animated Backgrounds */}
      <AnimatedBackground />
      <ParticlesBackground />

      {/* Navbar - Fixed at top */}
      <Navbar />

      {/* Sidebar - Below Navbar, Fixed Position */}
      {sidebar}

      {/* Main Content - No gap from navbar */}
      <main
        className="pt-20 transition-all duration-300 min-h-screen relative z-10"
        style={{
          marginLeft: hasSidebar ? `${sidebarWidth}px` : '0'
        }}
      >
        {children}
      </main>

      {/* Footer */}
      {showFooter && (
        <footer
          className="border-t border-slate-200 dark:border-slate-800 py-6 transition-all duration-300 bg-white/80 dark:bg-transparent backdrop-blur-sm relative z-10"
          style={{
            marginLeft: hasSidebar ? `${sidebarWidth}px` : '0'
          }}
        >
          <div className="container mx-auto px-4 text-center text-slate-600 dark:text-slate-400 text-sm">
            © {new Date().getFullYear()} SolVote. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
}