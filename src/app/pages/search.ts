import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../api';
import { AccessPipe, CoverPreview, PriceTag } from '../ui';

@Component({
  imports: [FormsModule, RouterLink, PriceTag, AccessPipe, CoverPreview],
  template: `
    <div class="pagehead"><div class="wrap">
      <h1>Find a past paper</h1>
      <p>Try “BGCSE Biology 2024”, or narrow it down with the filters.</p>
    </div></div>
    <div class="wrap" style="padding:24px 16px 56px">
      <form class="filters" (submit)="$event.preventDefault(); go()">
        <input type="search" name="q" [(ngModel)]="term" placeholder="e.g. BGCSE Biology 2024" aria-label="Search papers">
        <select name="qual" [(ngModel)]="qual" (ngModelChange)="go()" aria-label="Qualification">
          <option value="">All qualifications</option>
          @for (q of quals(); track q.id) { <option [value]="q.code">{{ q.code }}</option> }
        </select>
        <select name="year" [(ngModel)]="yr" (ngModelChange)="go()" aria-label="Year">
          <option value="">Any year</option>
          @for (y of years(); track y) { <option [value]="y">{{ y }}</option> }
        </select>
        <button class="btn" type="submit">Search</button>
      </form>

      @if (res(); as r) {
        @if (r.subjects.length) {
          <p class="muted" style="margin-bottom:6px">Subjects</p>
          <div class="chips">@for (s of r.subjects; track s.id) { <a class="chip" [routerLink]="['/subject', s.id]">{{ s.qualification }} {{ s.name }}</a> }</div>
        }
        <h2 style="margin-top:20px">{{ r.papers.length }} past paper{{ r.papers.length === 1 ? '' : 's' }} found</h2>
        <div class="tablewrap"><table>
          <thead><tr><th>Qualification</th><th>Subject</th><th>Year</th><th>Paper</th><th>Access</th><th></th></tr></thead>
          <tbody>
            @for (p of r.papers; track p.id) {
              <tr>
                <td>{{ p.qualification }}</td><td>{{ p.subject }}</td><td><b>{{ p.exam_year }}</b></td><td>{{ p.paper_type }}</td>
                <td>@if (p.owned) { <span class="badge owned">Owned</span> } @else if (p.price) { <app-price [price]="p.price" [regular]="p.regular_price" [onSale]="p.on_sale" [label]="p.sale_label" [currency]="r.currency" /><br><span class="muted small">{{ p.access_days | access }}</span> } @else { <span class="muted">Not sold separately</span> }</td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn small ghost" (click)="preview.set(p)">Preview</button>
                  @if (p.owned) { <a class="btn small" [routerLink]="['/view', p.id]">Open</a> }
                  @else if (p.product_id) { <a class="btn small" [routerLink]="['/checkout', p.product_id]">Buy</a> }
                </td>
              </tr>
            } @empty { <tr><td colspan="6" class="muted">No papers match. Try fewer words, or <a [routerLink]="['/']">browse by qualification</a>.</td></tr> }
          </tbody>
        </table></div>
      } @else if (loading()) { <p class="muted">Searching…</p> }
      @else { <p class="muted">Type what you are looking for, or pick a qualification or year.</p> }
    </div>

    @if (preview(); as p) {
      <app-cover-preview [paperId]="p.id" [title]="p.qualification + ' ' + p.subject + ' ' + p.exam_year + ' ' + p.paper_type" (closed)="preview.set(null)">
        @if (p.owned) { <a class="btn" [routerLink]="['/view', p.id]">Open full paper</a> }
        @else if (p.product_id) { <a class="btn rust" [routerLink]="['/checkout', p.product_id]">Buy this paper</a> }
      </app-cover-preview>
    }
  `,
})
export class Search {
  q = input<string>(''); qualification = input<string>(''); year = input<string>('');
  private api = inject(Api); private router = inject(Router);
  term = ''; qual = ''; yr = '';
  quals = signal<any[]>([]); years = signal<number[]>([]);
  res = signal<any>(null); loading = signal(false); preview = signal<any>(null);

  constructor() {
    this.api.get('/catalog/qualifications').subscribe((r) => this.quals.set(r.qualifications));
    this.api.get('/catalog/years').subscribe((r) => this.years.set(r));
    effect(() => {
      this.term = this.q() || ''; this.qual = this.qualification() || ''; this.yr = this.year() || '';
      if (!this.term.trim() && !this.qual && !this.yr) { this.res.set(null); return; }
      this.loading.set(true);
      const qs = new URLSearchParams({ q: this.term, qualification: this.qual, year: this.yr }).toString();
      this.api.ready.then(() => this.api.get('/catalog/search?' + qs).subscribe({
        next: (r) => { this.res.set(r); this.loading.set(false); }, error: () => this.loading.set(false),
      }));
    });
  }
  go() {
    this.router.navigate(['/search'], { queryParams: { q: this.term.trim() || null, qualification: this.qual || null, year: this.yr || null } });
  }
}
