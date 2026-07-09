import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', canActivate: [noAuthGuard], loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
  { path: 'session-start', canActivate: [authGuard], loadComponent: () => import('./features/session/session-start/session-start').then(m => m.SessionStart) },
  { path: 'session-end', canActivate: [authGuard], loadComponent: () => import('./features/session/session-end/session-end').then(m => m.SessionEnd) },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'counter-sale', loadComponent: () => import('./features/counter-sale/counter-sale').then(m => m.CounterSale) },

      { path: 'reports', redirectTo: 'reports/user-report', pathMatch: 'full' },
      { path: 'reports/user-report', loadComponent: () => import('./features/reports/user-report/user-report').then(m => m.UserReport) },
      { path: 'reports/product-report', loadComponent: () => import('./features/reports/product-report/product-report').then(m => m.ProductReport) },
      { path: 'reports/bill-report', loadComponent: () => import('./features/reports/bill-report/bill-report').then(m => m.BillReport) },
      { path: 'reports/customer-report', loadComponent: () => import('./features/reports/customer-report/customer-report').then(m => m.CustomerReport) },
      { path: 'reports/all-party-balance', loadComponent: () => import('./features/reports/all-party-balance/all-party-balance').then(m => m.AllPartyBalance) },
      { path: 'reports/gst-report', loadComponent: () => import('./features/reports/gst-report/gst-report').then(m => m.GstReport) },
      { path: 'reports/customer-payment-history', loadComponent: () => import('./features/reports/customer-payment-history/customer-payment-history').then(m => m.CustomerPaymentHistory) },
      { path: 'reports/cash-report', loadComponent: () => import('./features/reports/cash-report/cash-report').then(m => m.CashReport) },
      { path: 'reports/sales-invoice-report', loadComponent: () => import('./features/reports/sales-invoice-report/sales-invoice-report').then(m => m.SalesInvoiceReport) }
    ]
  },

  { path: '**', loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent) }
];