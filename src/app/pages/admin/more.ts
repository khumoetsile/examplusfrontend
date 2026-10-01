import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../api';
import { Toast } from '../../ui';

@Component({
  imports: [CurrencyPipe, DatePipe, FormsModule],
  template: `
    <h1>Orders</h1>
    <div class="toolbar">
      <select [ngModel]="status()" (ngModelChange)="status.set($event)"><option value="">All statuses</option><option>paid</option><option>pending</option><option>failed</option><option>cancelled</option></select>
      <input type="search" placeholder="Search email, item or reference…" [ngModel]="search()" (ngModelChange)="search.set($event)">
    </div>
    <div class="tablewrap"><table>
      <thead><tr><th>#</th><th>Date</th><th>Learner</th><th>Items</th><th>Total</th><th>Voucher</th><th>Status</th><th>DPO reference</th></tr></thead>
      <tbody>
        @for (o of list(); track o.id) {
          <tr><td>{{ o.id }}</td><td>{{ o.created_at | date: 'd MMM y, HH:mm' }}</td><td>{{ o.email }}</td><td>{{ o.items }}</td>
            <td>{{ o.total | currency: o.currency : 'symbol-narrow' }}@if (o.discount > 0) { <br><span class="muted">was {{ o.subtotal | currency: o.currency : 'symbol-narrow' }}</span> }</td>
            <td>{{ o.voucher_code || '—' }}</td>
            <td><span class="badge" [class]="'badge ' + o.status">{{ o.status }}</span></td>
            <td><span class="muted">{{ o.dpo_trans_ref || o.dpo_token }}</span></td></tr>
        } @empty { <tr><td colspan="8" class="muted">No orders.</td></tr> }
      </tbody>
    </table></div>
  `,
})
export class Orders {
  orders = signal<any[]>([]); status = signal(''); search = signal('');
  list = computed(() => {
    const s = this.search().toLowerCase();
    return this.orders().filter((o) => (!this.status() || o.status === this.status()) &&
      (!s || `${o.email} ${o.items} ${o.dpo_trans_ref} ${o.dpo_token} ${o.voucher_code}`.toLowerCase().includes(s)));
  });
  constructor() { inject(Api).get('/admin/orders').subscribe((r) => this.orders.set(r)); }
}

@Component({
  imports: [DatePipe, FormsModule],
  template: `
    <h1>Learners & access</h1>
    <div class="toolbar"><input type="search" placeholder="Search name or email…" [ngModel]="search()" (ngModelChange)="search.set($event)"><span class="muted">{{ list().length }} accounts</span></div>
    <div class="tablewrap"><table>
      <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Role</th><th>Active access</th><th></th></tr></thead>
      <tbody>
        @for (u of list(); track u.id) {
          <tr><td>{{ u.name }}</td><td>{{ u.email }}</td><td>{{ u.created_at | date: 'd MMM y' }}</td>
            <td><span class="badge">{{ u.role }}</span> @if (!u.active) { <span class="badge revoked">Disabled</span> }</td>
            <td>{{ u.active_access }}</td>
            <td style="text-align:right"><button class="btn small" (click)="open(u)">Manage</button></td></tr>
        }
      </tbody>
    </table></div>

    @if (sel(); as u) {
      <div class="modal-bg" (click)="sel.set(null)"><div class="modal card wide" (click)="$event.stopPropagation()">
        <h3>{{ u.name }} <span class="muted" style="font-weight:400">{{ u.email }}</span></h3>
        <div class="row">
          <div><label>Role</label><select [(ngModel)]="u.role"><option>learner</option><option>admin</option></select></div>
          <label class="chk" style="flex:0 0 auto;margin-top:26px"><input type="checkbox" [(ngModel)]="u.active"> Account enabled</label>
          <button class="btn small" (click)="saveUser(u)">Save account</button>
        </div>
        <h4>Access</h4>
        <div class="tablewrap"><table>
          <thead><tr><th>Product</th><th>Granted</th><th>Expires</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (a of access(); track a.id) {
              <tr><td>{{ a.name }}</td><td>{{ a.granted_at | date: 'd MMM y' }}</td><td>{{ a.expires_at ? (a.expires_at | date: 'd MMM y') : 'Never' }}</td>
                <td><span class="badge" [class]="'badge ' + (a.revoked ? 'revoked' : 'owned')">{{ a.revoked ? 'revoked' : 'active' }}</span></td>
                <td><button class="btn small ghost" (click)="toggle(a)">{{ a.revoked ? 'Restore' : 'Revoke' }}</button></td></tr>
            } @empty { <tr><td colspan="5" class="muted">No access yet.</td></tr> }
          </tbody>
        </table></div>
        <div class="row" style="margin-top:12px">
          <div><label>Grant free access to</label><select [(ngModel)]="grantId">
            <option [ngValue]="null">Choose a product…</option>
            @for (p of products(); track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }</select></div>
          <button class="btn small" (click)="grant(u)" [disabled]="!grantId">Grant</button>
        </div>
      </div></div>
    }
  `,
})
export class Learners {
  private api = inject(Api); private toast = inject(Toast);
  users = signal<any[]>([]); products = signal<any[]>([]); access = signal<any[]>([]); sel = signal<any>(null); search = signal(''); grantId: number | null = null;
  list = computed(() => { const s = this.search().toLowerCase(); return this.users().filter((u) => !s || `${u.name} ${u.email}`.toLowerCase().includes(s)); });
  constructor() {
    this.load();
    this.api.get('/admin/products').subscribe((r) => this.products.set(r.map((p: any) => ({ ...p, name: p.type === 'paper' ? `${p.qualification} ${p.subject} ${p.exam_year} ${p.paper_type}` : p.name }))));
  }
  private load() { this.api.get('/admin/users').subscribe((r) => this.users.set(r)); }
  open(u: any) { this.sel.set({ ...u, active: !!u.active }); this.loadAccess(u.id); }
  private loadAccess(id: number) { this.api.get(`/admin/users/${id}/access`).subscribe((a) => this.access.set(a)); }
  saveUser(u: any) { this.api.put(`/admin/users/${u.id}`, u).subscribe({ next: () => { this.toast.ok('Account saved'); this.load(); }, error: (e) => this.toast.fail(e) }); }
  toggle(a: any) { this.api.put(`/admin/access/${a.id}`, { revoked: !a.revoked }).subscribe(() => { this.loadAccess(this.sel().id); this.load(); }); }
  grant(u: any) {
    this.api.post(`/admin/users/${u.id}/access`, { product_id: this.grantId }).subscribe({
      next: () => { this.toast.ok('Access granted'); this.grantId = null; this.loadAccess(u.id); this.load(); }, error: (e) => this.toast.fail(e),
    });
  }
}

@Component({
  imports: [FormsModule],
  template: `
    <h1>Qualifications & subjects</h1>
    <p class="muted">Add the subjects you offer. A purchasable bundle is created automatically; set its price under Prices & specials.</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));align-items:start">
      @for (q of quals(); track q.id) {
        <div class="card">
          <div class="row" style="align-items:center;flex-wrap:nowrap"><input [(ngModel)]="q.name" style="font-weight:700"><button class="btn small" (click)="saveQ(q)">Save</button></div>
          <input [(ngModel)]="q.description" placeholder="Short description" style="margin-top:8px">
          <label class="chk"><input type="checkbox" [(ngModel)]="q.active"> Shown on the site</label>
          <h4 style="margin:14px 0 6px">Subjects</h4>
          @for (s of subjectsOf(q.id); track s.id) {
            <div class="row" style="flex-wrap:nowrap;margin-bottom:6px;align-items:center">
              <input [(ngModel)]="s.name"><label class="chk" style="margin:0;white-space:nowrap"><input type="checkbox" [(ngModel)]="s.active"> Live</label>
              <button class="btn small ghost" (click)="saveS(s)">Save</button><button class="btn small danger" (click)="delS(s)">×</button>
            </div>
          }
          <div class="row" style="flex-wrap:nowrap;margin-top:10px"><input [(ngModel)]="newSubject[q.id]" placeholder="New subject name" (keyup.enter)="addS(q)"><button class="btn small" (click)="addS(q)">Add</button></div>
        </div>
      }
    </div>
    <div class="card" style="margin-top:18px;max-width:560px"><h3>Add a qualification</h3>
      <div class="row"><div><label>Code</label><input [(ngModel)]="nq.code" placeholder="e.g. BGCSE"></div><div><label>Name</label><input [(ngModel)]="nq.name"></div></div>
      <label>Description</label><input [(ngModel)]="nq.description"><p><button class="btn" (click)="addQ()">Add qualification</button></p></div>
  `,
})
export class Catalog {
  private api = inject(Api); private toast = inject(Toast);
  quals = signal<any[]>([]); subjects = signal<any[]>([]); newSubject: Record<number, string> = {}; nq: any = {};
  constructor() { this.load(); }
  subjectsOf = (id: number) => this.subjects().filter((s) => s.qualification_id === id);
  private load() {
    this.api.get('/admin/qualifications').subscribe((r) => this.quals.set(r.map((q: any) => ({ ...q, active: !!q.active }))));
    this.api.get('/admin/subjects').subscribe((r) => this.subjects.set(r.map((s: any) => ({ ...s, active: !!s.active }))));
  }
  private done = (m: string) => ({ next: () => { this.toast.ok(m); this.load(); }, error: (e: any) => this.toast.fail(e) });
  saveQ(q: any) { this.api.put(`/admin/qualifications/${q.id}`, q).subscribe(this.done('Saved')); }
  saveS(s: any) { this.api.put(`/admin/subjects/${s.id}`, s).subscribe(this.done('Saved')); }
  addS(q: any) { const n = this.newSubject[q.id]?.trim(); if (!n) return; this.newSubject[q.id] = ''; this.api.post('/admin/subjects', { qualification_id: q.id, name: n }).subscribe(this.done('Subject added')); }
  delS(s: any) { if (confirm(`Delete ${s.name}? All its papers will be deleted too.`)) this.api.del(`/admin/subjects/${s.id}`).subscribe(this.done('Subject deleted')); }
  addQ() { this.api.post('/admin/qualifications', this.nq).subscribe({ next: () => { this.nq = {}; this.toast.ok('Qualification added'); this.load(); }, error: (e) => this.toast.fail(e) }); }
}

@Component({
  imports: [FormsModule],
  template: `
    <h1>Settings</h1>
    <div class="card" style="max-width:560px">
      <h3>Access period</h3>
      <p class="muted" style="margin-top:0">How long a learner keeps access after paying. This is a one-off payment: when the period ends the learner can simply buy again. Learners see the period next to every price.</p>
      <label>Default access period for new products</label>
      <select [(ngModel)]="days"><option value="">Lifetime (never expires)</option>
        <option value="30">1 month</option><option value="90">3 months</option><option value="180">6 months</option>
        <option value="365">12 months</option><option value="730">24 months</option></select>
      <p style="margin-bottom:0"><button class="btn" (click)="saveDays()">Save default</button></p>
      <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">
      <p class="muted" style="margin:0 0 8px">Apply this period to <b>every existing</b> product too. It only affects future purchases; people who already paid keep what they were promised.</p>
      <button class="btn ghost" (click)="applyAll()">Apply to all existing products</button>
    </div>
    <div class="card" style="max-width:560px;margin-top:16px">
      <h3>Currency</h3>
      <label>Currency code</label><input [(ngModel)]="currency" maxlength="3" placeholder="BWP" style="text-transform:uppercase">
      <p class="muted" style="font-size:.85rem">Shown on prices and sent to DPO at payment. Use a code your DPO account supports (e.g. BWP, USD).</p>
      <button class="btn" (click)="saveCurrency()">Save currency</button>
    </div>
  `,
})
export class Settings {
  private api = inject(Api); private toast = inject(Toast);
  currency = 'BWP'; days = '';
  constructor() { this.api.get('/admin/settings').subscribe((s) => { this.currency = s.currency; this.days = s.default_access_days || ''; }); }
  saveCurrency() { this.api.put('/admin/settings', { currency: this.currency }).subscribe({ next: () => this.toast.ok('Currency saved'), error: (e) => this.toast.fail(e) }); }
  saveDays() { this.api.put('/admin/settings', { default_access_days: this.days }).subscribe({ next: () => this.toast.ok('Default access period saved'), error: (e) => this.toast.fail(e) }); }
  applyAll() {
    if (!confirm('Set this access period on every product?')) return;
    this.api.post('/admin/settings/apply-access', { days: this.days }).subscribe({ next: (r) => this.toast.ok(r.changed + ' products updated'), error: (e) => this.toast.fail(e) });
  }
}

@Component({
  imports: [DatePipe],
  template: `
    <h1>Activity log</h1><p class="muted">The latest 300 events: sign-ins, payments, paper views and admin changes.</p>
    <div class="tablewrap"><table><thead><tr><th>When</th><th>User</th><th>Action</th><th>Detail</th></tr></thead><tbody>
      @for (a of rows(); track a.id) { <tr><td style="white-space:nowrap">{{ a.created_at | date: 'd MMM, HH:mm' }}</td><td>{{ a.email || '—' }}</td><td>{{ a.action }}</td><td class="muted">{{ a.detail }}</td></tr> }
    </tbody></table></div>
  `,
})
export class Activity {
  rows = signal<any[]>([]);
  constructor() { inject(Api).get('/admin/audit').subscribe((r) => this.rows.set(r)); }
}
