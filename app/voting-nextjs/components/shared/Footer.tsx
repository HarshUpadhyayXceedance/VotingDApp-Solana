'use client';

import { Vote } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-slate-200 dark:border-slate-800">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 to-green-400 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <div className="w-7 h-7 bg-white dark:bg-slate-950 rounded-lg flex items-center justify-center">
                  <Vote className="w-4 h-4 text-slate-900 dark:text-white" />
                </div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                SolVote
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
              Decentralized voting infrastructure for the modern web. Built on Solana for
              lightning-fast, transparent, and tamper-proof governance.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Platform
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/elections" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-purple-400 transition-colors">
                  Elections
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-purple-400 transition-colors">
                  Admin Dashboard
                </Link>
              </li>
              <li>
                <a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-purple-400 transition-colors">
                  Results
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-purple-400 transition-colors">
                  Analytics
                </a>
              </li>
            </ul>
          </div>

          {/* Developer Links */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Developers
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://docs.solana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-purple-400 transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-purple-400 transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-purple-400 transition-colors">
                  SDK
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-purple-400 transition-colors">
                  API Reference
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 gap-4">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            © {currentYear} SolVote. All rights reserved.
          </p>

          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-slate-600 dark:text-slate-400">Running on Solana Devnet</span>
          </div>
        </div>
      </div>
    </footer>
  );
}