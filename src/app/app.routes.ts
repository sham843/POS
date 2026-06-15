import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', canActivate: [noAuthGuard], loadComponent: () => import('./features/home/home').then(m => m.Home) },
  { path: 'login', canActivate: [noAuthGuard], loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
  { path: 'session-start', canActivate: [authGuard], loadComponent: () => import('./features/session/session-start/session-start').then(m => m.SessionStart) },
  { path: 'session-end', canActivate: [authGuard], loadComponent: () => import('./features/session/session-end/session-end').then(m => m.SessionEnd) },
  { path: 'counter-sale', canActivate: [authGuard], loadComponent: () => import('./features/counter-sale/counter-sale').then(m => m.CounterSale) },
  { path: '**', loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent) }
];
