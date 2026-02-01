'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Vote,
  ClipboardList,
  CheckCircle2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Home,
  Bell,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { cn } from '@/lib/utils';

interface VoterSidebarProps {
  pendingCount?: number;
}

export function VoterSidebar({ pendingCount = 0 }: VoterSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { publicKey } = useWallet();

  // Dispatch sidebar width for AppLayout
  useEffect(() => {
    const width = collapsed ? 64 : 256; // w-16 = 64px, w-64 = 256px
    window.dispatchEvent(
      new CustomEvent('sidebarResize', { detail: { width } })
    );
  }, [collapsed]);

  const menuItems = [
    {
      name: 'Browse Elections',
      href: '/elections',
      icon: ClipboardList,
      badge: null,
      exact: true,
    },
    {
      name: 'My Votes',
      href: '/elections/my-votes',
      icon: CheckCircle2,
      badge: null,
    },
    {
      name: 'Registration',
      href: '/elections/registration',
      icon: UserCheck,
      badge: pendingCount > 0 ? pendingCount.toString() : null,
    },
  ];

  return (
    <div
      className={cn(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-gray-900 border-r border-gray-800 transition-all duration-300 z-40 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Navigation Items */}
      <nav className="flex-1 px-2 pt-4 pb-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname?.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative',
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="font-medium flex-1">{item.name}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full font-semibold">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}

                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      {item.name}
                      {item.badge && (
                        <span className="ml-2 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer Section */}
      <div className="p-2 border-t border-gray-800">
        {/* User Info - Only show when expanded and wallet connected */}
        {!collapsed && publicKey && (
          <div className="mb-2 p-3 bg-gray-800/60 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Connected Wallet</div>
            <div className="font-mono text-xs text-white truncate">
              {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-6)}
            </div>
          </div>
        )}

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center justify-center px-3 py-2 rounded-lg transition-all duration-200',
            'text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-700 hover:border-purple-500'
          )}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 mr-2" />
              <span className="font-medium text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}