import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api } from '../../api';

@Component({
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <h1>Dashboard</h1>
    <p class="muted">A quick look at how the portal is doing.</p>
    @if (r(); as r) {
      <div class="stats">
        <div class="card stat"><b>{{ r.revenue | currency: cur() : 'symbol-narrow' }}</b>Revenue</div>
        <div class="card stat"><b>{{ r.orders_paid }}</b>Paid orders</div>
        <div class="card stat"><b>{{ r.learners }}</b>Learners</div>
        <div class="card stat"><b>{{ r.paper_views }}</b>Paper views</div>
      </div>
      <div class="quick">
        <a class="btn" routerLink="../papers">Upload papers</a>
        <a class="btn ghost" routerLink="../pricing">Set prices & specials</a>
        <a class="btn ghost" routerLink="../vouchers">Create a voucher</a>
      </div>
      <h2>Best sellers</h2>
      <div class="tablewrap"><table><thead><tr><th>Product</th><th>Sales</th><th>Revenue</th></tr></thead><tbody>
        @for (t of r.top; track t.name) { <tr><td>{{ t.name }}</td><td>{{ t.sales }}</td><td>{{ t.revenue | currency: cur() : 'symbol-narrow' }}</td></tr> }
        @empty { <tr><td colspan="3" class="muted">No sales yet.</td></tr> }
      </tbody></table></div>
      <h2>Last 30 days</h2>
      <div class="tablewrap"><table><thead><tr><th>Day</th><th>Orders</th><th>Revenue</th></tr></thead><tbody>
        @for (d of r.daily; track d.day) { <tr><td>{{ d.day | date: 'mediumDate' }}</td><td>{{ d.orders }}</td><td>{{ d.revenue | currency: cur() : 'symbol-narrow' }}</td></tr> }
        @empty { <tr><td colspan="3" class="muted">No sales in this period.</td></tr> }
      </tbody></table></div>
    }
  `,
})
export class Dashboard {
  r = signal<any>(null); cur = signal('BWP');
  constructor() {
    const api = inject(Api);
    api.get('/admin/reports').subscribe((r) => this.r.set(r));
    api.get('/admin/settings').subscribe((s) => this.cur.set(s.currency));
  }
}
