'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from './useProgram';
import { getAdminRegistryPda, getAdminPda } from '@/lib/helpers';
import { logger, isAccountNotFoundError } from '@/lib/logger';

interface AdminAuthState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  needsInitialization: boolean;
  loading: boolean;
  error: string;
}

interface UseAdminAuthResult extends AdminAuthState {
  refetch: () => Promise<void>;
}

/**
 * Shared hook for admin authentication and authorization
 * Reduces code duplication across admin pages
 */
export function useAdminAuth(): UseAdminAuthResult {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isSuperAdmin: false,
    needsInitialization: false,
    loading: true,
    error: '',
  });

  const checkAdminStatus = useCallback(async () => {
    if (!program || !publicKey) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: '' }));

      const [adminRegistryPda] = getAdminRegistryPda(program.programId);

      let adminRegistry;
      try {
        // @ts-ignore - Anchor types
        adminRegistry = await program.account.adminRegistry.fetch(adminRegistryPda);
      } catch (e) {
        if (isAccountNotFoundError(e)) {
          setState({
            isAdmin: false,
            isSuperAdmin: false,
            needsInitialization: true,
            loading: false,
            error: '',
          });
          return;
        }
        throw e;
      }

      const isSuperAdminUser = publicKey.equals(adminRegistry.superAdmin);
      const [adminPda] = getAdminPda(publicKey, program.programId);

      let hasAdminAccount = false;
      try {
        // @ts-ignore - Anchor types
        const adminAccount = await program.account.admin.fetch(adminPda);
        hasAdminAccount = adminAccount.is_active ?? adminAccount.isActive;
      } catch {
        hasAdminAccount = false;
      }

      const isAdminUser = isSuperAdminUser || hasAdminAccount;

      setState({
        isAdmin: isAdminUser,
        isSuperAdmin: isSuperAdminUser,
        needsInitialization: false,
        loading: false,
        error: isSuperAdminUser && !hasAdminAccount
          ? 'You are the super admin but need to create an admin account. Go to "Manage Admins".'
          : '',
      });
    } catch (error) {
      logger.error('Failed to check admin status', error);
      setState({
        isAdmin: false,
        isSuperAdmin: false,
        needsInitialization: false,
        loading: false,
        error: 'Failed to connect to the program.',
      });
    }
  }, [program, publicKey]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  return {
    ...state,
    refetch: checkAdminStatus,
  };
}
