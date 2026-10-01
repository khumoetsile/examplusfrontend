import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { Api } from './api';

const guard = (admin: boolean): CanActivateFn => async (_r, state) => {
  const api = inject(Api);
  await api.ready;
  if (api.user() && (!admin || api.isAdmin())) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { next: state.url } });
};

export const routes: Routes = [
  { path: '', title: 'Past Exam Papers | Elevate Skills', loadComponent: () => import('./pages/home').then((m) => m.Home) },
  { path: 'search', title: 'Search past papers', loadComponent: () => import('./pages/search').then((m) => m.Search) },
  { path: 'qualification/:code', loadComponent: () => import('./pages/qualification').then((m) => m.Qualification) },
  { path: 'subject/:id', loadComponent: () => import('./pages/subject').then((m) => m.Subject) },
  { path: 'login', title: 'Sign in', loadComponent: () => import('./pages/auth').then((m) => m.Auth), data: { mode: 'login' } },
  { path: 'register', title: 'Create account', loadComponent: () => import('./pages/auth').then((m) => m.Auth), data: { mode: 'register' } },
  { path: 'my-papers', title: 'My Papers', canActivate: [guard(false)], loadComponent: () => import('./pages/my-papers').then((m) => m.MyPapers) },
  { path: 'view/:id', title: 'Paper viewer', canActivate: [guard(false)], loadComponent: () => import('./pages/viewer').then((m) => m.Viewer) },
  { path: 'payment/result', title: 'Payment', loadComponent: () => import('./pages/payment-result').then((m) => m.PaymentResult) },
  { path: 'checkout/:id', title: 'Checkout', canActivate: [guard(false)], loadComponent: () => import('./pages/checkout').then((m) => m.Checkout) },
  {
    path: 'admin', title: 'Admin', canActivate: [guard(true)],
    loadComponent: () => import('./pages/admin/shell').then((m) => m.AdminShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/admin/dashboard').then((m) => m.Dashboard) },
      { path: 'papers', loadComponent: () => import('./pages/admin/papers').then((m) => m.Papers) },
      { path: 'pricing', loadComponent: () => import('./pages/admin/pricing').then((m) => m.Pricing) },
      { path: 'vouchers', loadComponent: () => import('./pages/admin/vouchers').then((m) => m.Vouchers) },
      { path: 'orders', loadComponent: () => import('./pages/admin/more').then((m) => m.Orders) },
      { path: 'learners', loadComponent: () => import('./pages/admin/more').then((m) => m.Learners) },
      { path: 'catalog', loadComponent: () => import('./pages/admin/more').then((m) => m.Catalog) },
      { path: 'settings', loadComponent: () => import('./pages/admin/more').then((m) => m.Settings) },
      { path: 'activity', loadComponent: () => import('./pages/admin/more').then((m) => m.Activity) },
    ],
  },
  { path: '**', redirectTo: '' },
];
