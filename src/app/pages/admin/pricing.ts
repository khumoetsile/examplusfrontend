import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../api';
import { Toast, toLocalInput } from '../../ui';

@Component({
  imports: [FormsModule, DatePipe],
  template: `
    <h1>Prices & specials</h1>
    <p class="muted">Set what each paper, subject bundle and qualification bundle costs. Items with no price are not for sale. Specials end automatically on the date you choose.</p>

    <div class="card">
      <h3>Run a special</h3>
      <p class="muted" style="margin-top:0">Take a percentage off a whole group of products in one go.</p>
      <div class="row">
        <div><label>Applies to</label>
          <select [(ngModel)]="sp.scope" (ngModelChange)="sp.scope_id = null">
            <option value="all">Everything</option><option value="qualification">One qualification</option><option value="subject">One subject</option></select></div>
        @if (sp.scope === 'qualification') {
          <div><label>Qualification</label><select [(ngModel)]="sp.scope_id">@for (q of quals(); track q.id) { <option [ngValue]="q.id">{{ q.code }}</option> }</select></div>
        }
        @if (sp.scope === 'subject') {
          <div><label>Subject</label><select [(ngModel)]="sp.scope_id">@for (s of subjects(); track s.id) { <option [ngValue]="s.id">{{ s.qualification_code }} – {{ s.name }}</option> }</select></div>
        }
        <div><label>Which products</label>
          <select [(ngModel)]="sp.type"><option value="">All types</option><option value="paper">Single papers</option><option value="subject">Subject bundles</option><option value="qualification">Qualification bundles</option></select></div>
      </div>
      <div class="row">
        <div><label>Discount (%)</label><input type="number" min="1" max="99" [(ngModel)]="sp.percent" placeholder="e.g. 20"></div>
        <div><label>Starts (optional)</label><input type="datetime-local" [(ngModel)]="sp.starts"></div>
        <div><label>Ends</label><input type="datetime-local" [(ngModel)]="sp.ends"></div>
        <div><label>Label shown to learners</label><input [(ngModel)]="sp.label" placeholder="e.g. Exam season special"></div>
      </div>
      <p style="margin-bottom:0"><button class="btn rust" (click)="applySpecial()">Apply special</button>
        <button class="btn ghost" (click)="clearAll()" style="margin-left:8px">End all specials now</button></p>
    </div>

    <div class="toolbar">
      <select [ngModel]="type()" (ngModelChange)="type.set($event)">
        <option value="">All products</option><option value="qualification">Qualification bundles</option><option value="subject">Subject bundles</option><option value="paper">Single papers</option></select>
      <select [ngModel]="qual()" (ngModelChange)="qual.set($event)"><option value="">All qualifications</option>
        @for (q of quals(); track q.id) { <option [value]="q.code">{{ q.code }}</option> }</select>
      <input type="search" placeholder="Search…" [ngModel]="search()" (ngModelChange)="search.set($event)">
      <label class="chk"><input type="checkbox" [ngModel]="onlyUnpriced()" (ngModelChange)="onlyUnpriced.set($event)"> Only unpriced</label>
    </div>

    <div class="tablewrap"><table>
      <thead><tr><th>Product</th><th style="width:120px">Regular price</th><th style="width:120px">Special price</th><th>Special ends</th><th>Status</th><th></th></tr></thead>
      <tbody>
        @for (p of list(); track p.id) {
          <tr>
            <td><b>{{ label(p) }}</b><br><span class="muted">{{ kind(p) }}</span></td>
            <td><input type="number" min="0" step="0.01" [(ngModel)]="p.price" (ngModelChange)="p._dirty = true"></td>
            <td><input type="number" min="0" step="0.01" [(ngModel)]="p.sale_price" (ngModelChange)="p._dirty = true" placeholder="—"></td>
            <td>@if (p.sale_price !== null && p.sale_price !== '') { {{ p.sale_ends ? (p.sale_ends | date: 'd MMM y, HH:mm') : 'No end date' }} } @else { <span class="muted">—</span> }</td>
            <td>@if (!(p.price > 0)) { <span class="badge pending">Not for sale</span> } @else if (p.on_sale) { <span class="badge sale">On special</span> } @else if (p.sale_price !== null && p.sale_price !== '') { <span class="badge">Scheduled</span> } @else { <span class="badge owned">Regular</span> }
              @if (!p.active) { <span class="badge revoked">Hidden</span> }</td>
            <td style="text-align:right;white-space:nowrap">
              @if (p._dirty) { <button class="btn small" (click)="save(p)">Save</button> }
              <button class="btn small ghost" (click)="more(p)">More</button>
            </td>
          </tr>
        } @empty { <tr><td colspan="6" class="muted">Nothing matches these filters.</td></tr> }
      </tbody>
    </table></div>

    @if (editing(); as e) {
      <div class="modal-bg" (click)="editing.set(null)"><div class="modal card" (click)="$event.stopPropagation()">
        <h3>{{ label(e) }}</h3>
        <div class="row"><div><label>Regular price</label><input type="number" min="0" step="0.01" [(ngModel)]="e.price"></div>
          <div><label>Special price</label><input type="number" min="0" step="0.01" [(ngModel)]="e.sale_price" placeholder="No special"></div></div>
        <div class="row"><div><label>Special starts</label><input type="datetime-local" [(ngModel)]="e._starts"></div>
          <div><label>Special ends</label><input type="datetime-local" [(ngModel)]="e._ends"></div></div>
        <label>Special label</label><input [(ngModel)]="e.sale_label" placeholder="e.g. Exam season special">
        <label>How long learners keep access</label>
        <div class="chips"><button type="button" class="chip" [class.on]="!e.access_days" (click)="e.access_days = null">Lifetime</button>
          @for (o of presets; track o.d) { <button type="button" class="chip" [class.on]="e.access_days === o.d" (click)="e.access_days = o.d">{{ o.t }}</button> }</div>
        <input type="number" min="1" [(ngModel)]="e.access_days" placeholder="or a number of days" style="margin-top:8px">
        <label class="chk"><input type="checkbox" [(ngModel)]="e.active"> Available to buy</label>
        <div class="row" style="margin-top:16px">
          <button class="btn ghost small" (click)="e.sale_price = null">Remove special</button>
          <span style="flex:1"></span>
          <button class="btn ghost" (click)="editing.set(null)">Cancel</button>
          <button class="btn" (click)="saveMore(e)">Save</button>
        </div>
      </div></div>
    }
  `,
})
export class Pricing {
  private api = inject(Api); private toast = inject(Toast);
  items = signal<any[]>([]); quals = signal<any[]>([]); subjects = signal<any[]>([]);
  type = signal(''); qual = signal(''); search = signal(''); onlyUnpriced = signal(false);
  editing = signal<any>(null);
  presets = [{ d: 30, t: '1 month' }, { d: 90, t: '3 months' }, { d: 180, t: '6 months' }, { d: 365, t: '12 months' }, { d: 730, t: '24 months' }];
  sp: any = { scope: 'all', type: '', percent: null, starts: '', ends: '', label: '' };

  list = computed(() => {
    const s = this.search().toLowerCase();
    return this.items().filter((p) =>
      (!this.type() || p.type === this.type()) && (!this.qual() || p.qualification === this.qual()) &&
      (!this.onlyUnpriced() || !(p.price > 0)) && (!s || this.label(p).toLowerCase().includes(s)));
  });

  constructor() {
    this.load();
    this.api.get('/admin/qualifications').subscribe((r) => this.quals.set(r));
    this.api.get('/admin/subjects').subscribe((r) => this.subjects.set(r));
  }
  label = (p: any) => p.type === 'paper' ? `${p.qualification} ${p.subject} ${p.exam_year} ${p.paper_type}` : p.name;
  kind = (p: any) => ({ paper: 'Single paper', subject: 'Subject bundle', qualification: 'Qualification bundle' } as any)[p.type];

  private load() {
    this.api.get('/admin/products').subscribe((r) => this.items.set(r.map((p: any) => ({ ...p, _dirty: false }))));
  }
  private body(p: any, extra: any = {}) {
    return { name: p.name, price: p.price, access_days: p.access_days, active: p.active, sale_price: p.sale_price,
      sale_starts: p.sale_starts, sale_ends: p.sale_ends, sale_label: p.sale_label, ...extra };
  }
  save(p: any) {
    const b = this.body(p, { sale_label: p.sale_label || (p.sale_price !== null && p.sale_price !== '' ? 'Special' : null) });
    this.api.put(`/admin/products/${p.id}`, b).subscribe({ next: () => { this.toast.ok('Price saved'); this.load(); }, error: (e) => this.toast.fail(e) });
  }
  more(p: any) { this.editing.set({ ...p, _starts: toLocalInput(p.sale_starts), _ends: toLocalInput(p.sale_ends), active: !!p.active }); }
  saveMore(e: any) {
    this.api.put(`/admin/products/${e.id}`, this.body(e, { sale_starts: e._starts || null, sale_ends: e._ends || null })).subscribe({
      next: () => { this.editing.set(null); this.toast.ok('Saved'); this.load(); }, error: (x) => this.toast.fail(x),
    });
  }
  applySpecial() {
    const s = this.sp;
    if ((s.scope !== 'all' && !s.scope_id) || !s.percent) return this.toast.show('Choose where it applies and the discount %.', true);
    if (!s.ends && !confirm('No end date set: the special will run until you end it. Continue?')) return;
    this.api.post('/admin/specials', { ...s, starts: s.starts || null, ends: s.ends || null }).subscribe({
      next: (r) => { this.toast.ok(`Special applied to ${r.changed} products`); this.load(); }, error: (e) => this.toast.fail(e),
    });
  }
  clearAll() {
    if (!confirm('End every special price right now?')) return;
    this.api.del('/admin/specials').subscribe({ next: (r) => { this.toast.ok(`${r.changed} specials ended`); this.load(); }, error: (e) => this.toast.fail(e) });
  }
}
