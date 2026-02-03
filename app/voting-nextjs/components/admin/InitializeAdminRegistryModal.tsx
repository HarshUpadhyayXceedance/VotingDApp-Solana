'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { SystemProgram } from '@solana/web3.js';
import { getAdminRegistryPda } from '@/lib/helpers';
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Shield, AlertTriangle } from 'lucide-react';

interface InitializeAdminRegistryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InitializeAdminRegistryModal({
  open,
  onClose,
  onSuccess,
}: InitializeAdminRegistryModalProps) {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInitialize = async () => {
    if (!program || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Derive admin registry PDA
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);

      logger.debug('Initializing admin registry', {
        component: 'InitializeAdminRegistryModal',
        userId: publicKey.toString(),
      });

      // Initialize admin registry
      // @ts-ignore
      const tx = await program.methods
        .initializeAdminRegistry()
        .accountsStrict({
          adminRegistry: adminRegistryPda,
          superAdmin: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      logger.transaction('admin registry initialized', tx);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        onSuccess();
      }, 2000);
    } catch (error: any) {
      const msg: string = error?.message || '';

      // "already in use" means the registry already exists on-chain.
      // This is not an error from the user's perspective — treat it as
      // success and let the dashboard reload so it picks up the existing
      // registry.
      if (msg.includes('already in use') || msg.includes('custom program error: 0x0')) {
        logger.info('Admin registry already exists', { component: 'InitializeAdminRegistryModal' });
        setSuccess(true);

        setTimeout(() => {
          setSuccess(false);
          onSuccess(); // <-- this triggers fetchData() in the parent, which will now succeed
        }, 1500);
        return;
      }

      if (msg.includes('insufficient')) {
        setError('Insufficient SOL. Please get more SOL from a faucet.');
      } else {
        logger.error('Failed to initialize admin registry', error, { component: 'InitializeAdminRegistryModal' });
        setError(msg || 'Failed to initialize admin registry');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" />
            Initialize Admin Registry
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            One-time setup to create the admin registry on-chain
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Registry Ready!</h3>
            <p className="text-gray-400">Loading your dashboard…</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-bold text-yellow-400">Important Information</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• This is a <strong>one-time operation</strong></li>
                      <li>• Your wallet will become the <strong>super admin</strong></li>
                      <li>• Super admin has full control over the system</li>
                      <li>• You can add other admins after initialization</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <h4 className="font-bold text-white mb-2">What you'll be able to do:</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>✓ Add and manage other admins</li>
                  <li>✓ Set admin permissions</li>
                  <li>✓ Create elections</li>
                  <li>✓ Pause/unpause the system</li>
                </ul>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInitialize}
                disabled={loading}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Initialize Registry
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}