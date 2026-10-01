import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../api';
import { AccessPipe, CoverPreview, PriceTag } from '../ui';

@Component({
  imports: [RouterLink, PriceTag, AccessPipe, CoverPreview],
  template: `
    @if (data(); as d) {
      <div class="pagehead"><div class="wrap">
        <div class="crumbs"><a routerLink="/">Exam papers</a> ›
          <a [routerLink]="['/qualification', d.subject.qualification_code]">{{ d.subject.qualification_name }}</a> › {{ d.subject.name }}</div>
        <h1>{{ d.subject.qualification_code }} {{ d.subject.name }}</h1>
        <p>{{ d.papers.length }} past papers for revision and practice · view online in your account</p>
      </div></div>
      <div class="wrap" style="padding:28px 16px 56px">
        @if (d.ownsSubject) {
          <div class="msg ok">You own the complete {{ d.subject.name }} collection. Open any paper below.</div>
        } @else if (d.subjectBundle) {
          <div class="card promo">
            <div><b style="font-size:1.15rem">Unlock All {{ d.subject.name }} Papers</b><br>
              <span class="muted">Every available {{ d.subject.qualification_code }} {{ d.subject.name }} past paper, including future uploads. {{ d.subjectBundle.access_days | access }}.</span></div>
            <a class="btn gold" [routerLink]="['/checkout', d.subjectBundle.id]">Unlock for <app-price [price]="d.subjectBundle.price" [regular]="d.subjectBundle.regular_price" [onSale]="d.subjectBundle.on_sale" [currency]="d.currency" /></a>
          </div>
        }
        <div class="row" style="align-items:center;margin-top:8px">
          <h2 style="flex:1 1 auto;margin:18px 0 8px">Available past papers</h2>
          @if (years().length > 1) {
            <div class="chips" style="flex:0 1 auto">
              <button class="chip" [class.on]="!year()" (click)="year.set(null)">All years</button>
              @for (y of years(); track y) { <button class="chip" [class.on]="year() === y" (click)="year.set(y)">{{ y }}</button> }
            </div>
          }
        </div>
        <div class="tablewrap"><table>
          <thead><tr><th>Year</th><th>Paper</th><th>Access</th><th></th></tr></thead>
          <tbody>
            @for (p of shown(); track p.id) {
              <tr>
                <td><b>{{ p.exam_year }}</b></td><td>{{ p.paper_type }}</td>
                <td>@if (p.owned) { <span class="badge owned">Owned</span> } @else if (p.price) { <app-price [price]="p.price" [regular]="p.regular_price" [onSale]="p.on_sale" [label]="p.sale_label" [currency]="d.currency" /><br><span class="muted small">{{ p.access_days | access }}</span> } @else { <span class="muted">Not sold separately</span> }</td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn small ghost" (click)="preview.set(p)">Preview</button>
                  @if (p.owned) { <a class="btn small" [routerLink]="['/view', p.id]">Open paper</a> }
                  @else if (p.product_id) { <a class="btn small" [routerLink]="['/checkout', p.product_id]">Buy paper</a> }
                </td>
              </tr>
            } @empty { <tr><td colspan="4" class="muted">No papers uploaded yet.</td></tr> }
          </tbody>
        </table></div>
      </div>

      @if (preview(); as p) {
        <app-cover-preview [paperId]="p.id" [title]="d.subject.qualification_code + ' ' + d.subject.name + ' ' + p.exam_year + ' ' + p.paper_type" (closed)="preview.set(null)">
          @if (p.owned) { <a class="btn" [routerLink]="['/view', p.id]">Open full paper</a> }
          @else if (p.product_id) { <a class="btn rust" [routerLink]="['/checkout', p.product_id]">Buy this paper</a> }
        </app-cover-preview>
      }
    } @else if (missing()) { <p class="wrap">Subject not found.</p> }
  `,
})
export class Subject {
  id = input.required<string>();
  private api = inject(Api);
  data = signal<any>(null);
  missing = signal(false);
  year = signal<number | null>(null);
  preview = signal<any>(null);
  years = computed(() => [...new Set<number>((this.data()?.papers || []).map((p: any) => p.exam_year))]);
  shown = computed(() => (this.data()?.papers || []).filter((p: any) => !this.year() || p.exam_year === this.year()));
  constructor() {
    effect(() => {
      const id = this.id();
      this.year.set(null);
      this.api.ready.then(() =>
        this.api.get(`/catalog/subjects/${id}`).subscribe({
          next: (r) => this.data.set(r), error: () => this.missing.set(true),
        }));
    });
  }
}
