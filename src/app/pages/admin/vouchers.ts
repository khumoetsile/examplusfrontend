import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../api';
import { Toast, toLocalInput } from '../../ui';

@Component({
  imports: [FormsModule, DatePipe],
  template: `
    <div class="row" style="align-items:center"><h1 style="flex:1;margin:0">Voucher codes</h1>
      <button class="btn rust" (click)="add()">New voucher</button></div>
    <p class="muted">Give learners a code to use at checkout: a percentage or a fixed amount off, with optional limits and an expiry date.</p>

    <div class="tablewrap"><table>
      <thead><tr><th>Code</th><th>Discount</th><th>Used</th><th>Valid</th><th>Status</th><th></th></tr></thead>
      <tbody>
        @for (v of vouchers(); track v.id) {
          <tr>
            <td><b class="code">{{ v.code }}</b><br><span class="muted">{{ v.description }}</span></td>
            <td>{{ v.type === 'percent' ? v.value + '%' : v.value }} off@if (v.min_total > 0) { <br><span class="muted">min spend {{ v.min_total }}</span> }
              @if (v.product_name) { <br><span class="muted">only: {{ v.product_name }}</span> }</td>
            <td>{{ v.used_count }}{{ v.max_uses ? ' / ' + v.max_uses : '' }}</td>
            <td>@if (v.starts_at || v.expires_at) { {{ v.starts_at ? (v.starts_at | date: 'd MMM y') : 'now' }} → {{ v.expires_at ? (v.expires_at | date: 'd MMM y') : 'no end' }} } @else { <span class="muted">Always</span> }</td>
            <td><span class="badge" [class]="'badge ' + (status(v) === 'Active' ? 'owned' : 'revoked')">{{ status(v) }}</span></td>
            <td style="text-align:right;white-space:nowrap">
              <button class="btn small ghost" (click)="copy(v.code)">Copy</button>
              <button class="btn small" (click)="edit(v)">Edit</button></td>
          </tr>
        } @empty { <tr><td colspan="6" class="muted">No vouchers yet. Create one to get started.</td></tr> }
      </tbody>
    </table></div>

    @if (form(); as f) {
      <div class="modal-bg" (click)="form.set(null)"><div class="modal card" (click)="$event.stopPropagation()">
        <h3>{{ f.id ? 'Edit voucher' : 'New voucher' }}</h3>
        <label>Code</label>
        <div class="row" style="flex-wrap:nowrap"><input [(ngModel)]="f.code" placeholder="e.g. EXAM2026" style="text-transform:uppercase">
          <button class="btn ghost small" (click)="f.code = gen()">Generate</button></div>
        <label>Note for yourself (optional)</label><input [(ngModel)]="f.description" placeholder="e.g. School partnership">
        <div class="row">
          <div><label>Type</label><select [(ngModel)]="f.type"><option value="percent">Percentage off</option><option value="fixed">Fixed amount off</option></select></div>
          <div><label>{{ f.type === 'percent' ? 'Percent' : 'Amount' }}</label><input type="number" min="0" step="0.01" [(ngModel)]="f.value"></div>
        </div>
        <div class="row">
          <div><label>Minimum spend</label><input type="number" min="0" [(ngModel)]="f.min_total" placeholder="0"></div>
          <div><label>Total uses (blank = unlimited)</label><input type="number" min="1" [(ngModel)]="f.max_uses"></div>
          <div><label>Uses per learner</label><input type="number" min="0" [(ngModel)]="f.per_user_limit"></div>
        </div>
        <label>Only for this product (optional)</label>
        <select [(ngModel)]="f.product_id"><option [ngValue]="null">Any product</option>
          @for (p of products(); track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }</select>
        <div class="row">
          <div><label>Starts (optional)</label><input type="datetime-local" [(ngModel)]="f._starts"></div>
          <div><label>Expires (optional)</label><input type="datetime-local" [(ngModel)]="f._ends"></div>
        </div>
        <label class="chk"><input type="checkbox" [(ngModel)]="f.active"> Active</label>
        <div class="row" style="margin-top:16px">
          @if (f.id) { <button class="btn danger small" (click)="remove(f)">Delete</button> }
          <span style="flex:1"></span>
          <button class="btn ghost" (click)="form.set(null)">Cancel</button>
          <button class="btn" (click)="save(f)">Save voucher</button>
        </div>
      </div></div>
    }
  `,
})
export class Vouchers {
  private api = inject(Api); private toast = inject(Toast);
  vouchers = signal<any[]>([]); products = signal<any[]>([]); form = signal<any>(null);
  constructor() { this.load(); this.api.get('/admin/products').subscribe((r) => this.products.set(r)); }
  private load() { this.api.get('/admin/vouchers').subscribe((r) => this.vouchers.set(r)); }
  status(v: any) {
    const now = Date.now();
    if (!v.active) return 'Disabled';
    if (v.expires_at && new Date(v.expires_at).getTime() < now) return 'Expired';
    if (v.starts_at && new Date(v.starts_at).getTime() > now) return 'Scheduled';
    if (v.max_uses !== null && v.used_count >= v.max_uses) return 'Used up';
    return 'Active';
  }
  gen() { return 'ES' + Math.random().toString(36).slice(2, 8).toUpperCase(); }
  add() { this.form.set({ code: this.gen(), type: 'percent', value: 10, min_total: 0, max_uses: null, per_user_limit: 1, product_id: null, active: true, _starts: '', _ends: '' }); }
  edit(v: any) { this.form.set({ ...v, active: !!v.active, _starts: toLocalInput(v.starts_at), _ends: toLocalInput(v.expires_at) }); }
  copy(c: string) { navigator.clipboard?.writeText(c); this.toast.ok('Code copied'); }
  save(f: any) {
    const body = { ...f, starts_at: f._starts || null, expires_at: f._ends || null };
    const req = f.id ? this.api.put(`/admin/vouchers/${f.id}`, body) : this.api.post('/admin/vouchers', body);
    req.subscribe({ next: () => { this.form.set(null); this.toast.ok('Voucher saved'); this.load(); }, error: (e) => this.toast.fail(e) });
  }
  remove(f: any) {
    if (confirm('Delete this voucher? Orders already placed with it are not affected.'))
      this.api.del(`/admin/vouchers/${f.id}`).subscribe({ next: () => { this.form.set(null); this.toast.ok('Voucher deleted'); this.load(); }, error: (e) => this.toast.fail(e) });
  }
}
