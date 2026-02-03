'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Vote,
  BarChart3,
  Users,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  isSuperAdmin?: boolean;
}

export function AdminSidebar({ isSuperAdmin = false }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname() ?? '';

  // Dispatch custom event when sidebar width changes
  useEffect(() => {
    const width = collapsed ? 64 : 256; // w-16 = 64px, w-64 = 256px
    const event = new CustomEvent('sidebarResize', { detail: { width } });
    window.dispatchEvent(event);
  }, [collapsed]);

  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: 'Elections',
      href: '/admin/elections',
      icon: Vote,
    },
    {
      name: 'Results',
      href: '/admin/results',
      icon: BarChart3,
    },
    {
      name: 'Voters',
      href: '/admin/voters',
      icon: Users,
    },
  ];

  if (isSuperAdmin) {
    navItems.push({
      name: 'Manage Admins',
      href: '/admin/manage-admins',
      icon: Shield,
    });
  }

  navItems.push({
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  });

  return (
    <div
      className={cn(
        'fixed left-0 top-20 h-[calc(100vh-5rem)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-40 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Navigation Items */}
      <nav className="flex-1 px-2 pt-6 pb-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative',
                    isActive
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                    )}
                  />
                  {!collapsed && <span className="font-medium">{item.name}</span>}

                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg border border-slate-200 dark:border-slate-700">
                      {item.name}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Button */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center justify-center px-3 py-2 rounded-lg transition-all duration-200',
            'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 hover:border-violet-500'
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