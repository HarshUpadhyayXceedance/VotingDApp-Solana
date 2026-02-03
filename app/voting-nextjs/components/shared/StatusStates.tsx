'use client';

import { AlertCircle, Shield, Loader2 } from 'lucide-react';
import { AppLayout } from './AppLayout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Reusable loading spinner component
 */
export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-purple-500/30 border-t-purple-500 rounded-full animate-spin ${className}`}
    />
  );
}

/**
 * Full page loading state
 */
export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <LoadingSpinner size="md" />
    </div>
  );
}

interface WalletRequiredProps {
  showFooter?: boolean;
}

/**
 * Message shown when wallet is not connected
 */
export function WalletRequired({ showFooter = false }: WalletRequiredProps) {
  return (
    <AppLayout showFooter={showFooter}>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Wallet Not Connected
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Please connect your wallet to continue
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

interface AccessDeniedProps {
  message?: string;
  showFooter?: boolean;
}

/**
 * Message shown when user doesn't have permission
 */
export function AccessDenied({ message = 'You are not an admin', showFooter = false }: AccessDeniedProps) {
  return (
    <AppLayout showFooter={showFooter}>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-slate-600 dark:text-slate-400">{message}</p>
        </div>
      </div>
    </AppLayout>
  );
}

interface InitializationRequiredProps {
  onInitialize: () => void;
  showFooter?: boolean;
}

/**
 * Message shown when admin registry needs initialization
 */
export function InitializationRequired({ onInitialize, showFooter = false }: InitializationRequiredProps) {
  return (
    <AppLayout showFooter={showFooter}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <Shield className="w-20 h-20 text-purple-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Setup Required
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            The admin registry needs to be initialized.
          </p>
          <Button
            onClick={onInitialize}
            className="bg-gradient-to-r from-purple-500 to-purple-600"
          >
            <Shield className="w-4 h-4 mr-2" />
            Initialize Registry
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

interface SuperAdminWarningProps {
  message: string;
}

/**
 * Warning banner for super admin needing to create admin account
 */
export function SuperAdminWarning({ message }: SuperAdminWarningProps) {
  return (
    <div className="mb-8 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-yellow-400 mb-2">Action Required</h3>
          <p className="text-slate-700 dark:text-slate-300 mb-4">{message}</p>
          <Link href="/admin/manage-admins">
            <Button className="bg-yellow-600 hover:bg-yellow-700">
              <Shield className="w-4 h-4 mr-2" />
              Go to Manage Admins
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Generic error state component
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="text-center py-16">
      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <p className="text-red-400 mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Generic empty state component
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4">
        {icon}
      </div>
      <p className="text-slate-600 dark:text-slate-400 font-medium mb-2">{title}</p>
      {description && (
        <p className="text-slate-500 dark:text-slate-500 text-sm mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}
