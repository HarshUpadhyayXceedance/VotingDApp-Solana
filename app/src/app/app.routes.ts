import { Routes } from '@angular/router';
import { walletGuard } from './core/wallet.guard';
import { adminGuard } from './core/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'admin',
    canActivate: [walletGuard, adminGuard],
    loadComponent: () =>
      import('./admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'elections',
    canActivate: [walletGuard],
    loadComponent: () =>
      import('./elections/elections.component').then(m => m.ElectionsComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
