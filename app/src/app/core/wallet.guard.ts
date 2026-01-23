import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { WalletService } from '../services/wallet.service';

export const walletGuard: CanActivateFn = () => {
  const wallet = inject(WalletService);
  const router = inject(Router);

  if (!wallet.isConnected()) {
    router.navigateByUrl('/');
    return false;
  }
  return true;
};
