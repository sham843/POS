import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', canActivate: [noAuthGuard], loadComponent: () => import('./features/home/home').then(m => m.Home) },
  { path: 'login', canActivate: [noAuthGuard], loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
  { path: 'session-start', canActivate: [authGuard], loadComponent: () => import('./features/session/session-start/session-start').then(m => m.SessionStart) },
  { path: 'session-end', canActivate: [authGuard], loadComponent: () => import('./features/session/session-end/session-end').then(m => m.SessionEnd) },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: 'counter-sale', loadComponent: () => import('./features/counter-sale/counter-sale').then(m => m.CounterSale) },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'reports', loadComponent: () => import('./features/reports/reports').then(m => m.Reports) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings').then(m => m.Settings) }
    ]
  },

  { path: '**', loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent) }
];
