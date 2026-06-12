import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
  { path: 'session-summary', canActivate: [authGuard], loadComponent: () => import('./features/session-summary/session-summary').then(m => m.SessionSummary) },
  { path: 'counter-sale', canActivate: [authGuard], loadComponent: () => import('./features/counter-sale/counter-sale').then(m => m.CounterSale) },
  { path: '**', loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent) }
];
