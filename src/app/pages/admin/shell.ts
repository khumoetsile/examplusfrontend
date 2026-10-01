import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Toast } from '../../ui';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="adm">
      <aside class="adm-side">
        <div class="adm-title">Administration</div>
        @for (g of groups; track g.name) {
          <div class="adm-group">{{ g.name }}</div>
          @for (l of g.links; track l.path) {
            <a [routerLink]="l.path" routerLinkActive="on">{{ l.label }}</a>
          }
        }
      </aside>
      <section class="adm-main"><router-outlet /></section>
    </div>
    @if (toast.msg(); as m) { <div class="toast" [class.err]="m.err" role="status">{{ m.text }}</div> }
  `,
})
export class AdminShell {
  toast = inject(Toast);
  groups = [
    { name: 'Overview', links: [{ path: 'dashboard', label: 'Dashboard' }] },
    { name: 'Content', links: [{ path: 'papers', label: 'Exam papers' }, { path: 'catalog', label: 'Qualifications & subjects' }] },
    { name: 'Sales', links: [{ path: 'pricing', label: 'Prices & specials' }, { path: 'vouchers', label: 'Voucher codes' }, { path: 'orders', label: 'Orders' }] },
    { name: 'People', links: [{ path: 'learners', label: 'Learners & access' }] },
    { name: 'System', links: [{ path: 'settings', label: 'Settings' }, { path: 'activity', label: 'Activity log' }] },
  ];
}
