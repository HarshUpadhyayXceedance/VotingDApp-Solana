import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { RoleService } from './role.service';
import { WalletService } from '../services/wallet.service';

export const adminGuard: CanActivateFn = async () => {
  const wallet = inject(WalletService);
  const roleService = inject(RoleService);
  const router = inject(Router);

  const publicKey = wallet.publicKey;

  if (!publicKey) {
    router.navigateByUrl('/');
    return false;
  }

  const role = await roleService.resolveRole(publicKey);

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return true;
  }

  router.navigateByUrl('/elections');
  return false;
};
