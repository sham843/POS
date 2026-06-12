import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
  { path: 'session-summary', loadComponent: () => import('./features/session-summary/session-summary').then(m => m.SessionSummary) },
  { path: 'counter-sale', loadComponent: () => import('./features/counter-sale/counter-sale').then(m => m.CounterSale) }
];
