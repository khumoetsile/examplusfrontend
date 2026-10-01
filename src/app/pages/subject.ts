import { Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../api';
import { PriceTag } from '../ui';

@Component({
  imports: [RouterLink, PriceTag],
  template: `
    @if (data(); as d) {
      <div class="pagehead"><div class="wrap">
        <div class="crumbs"><a routerLink="/">Exam papers</a> ›
          <a [routerLink]="['/qualification', d.subject.qualification_code]">{{ d.subject.qualification_name }}</a> › {{ d.subject.name }}</div>
        <h1>{{ d.subject.qualification_code }} {{ d.subject.name }}</h1>
        <p>{{ d.papers.length }} papers available · read online in your account</p>
      </div></div>
      <div class="wrap" style="padding:28px 20px 56px">
        @if (error()) { <div class="msg err">{{ error() }}</div> }
        @if (d.ownsSubject) {
          <div class="msg ok">You own the complete {{ d.subject.name }} collection. Open any paper below.</div>
        } @else if (d.subjectBundle) {
          <div class="card promo">
            <div><b style="font-size:1.15rem">Unlock All {{ d.subject.name }} Papers</b><br>
              <span class="muted">Access every available {{ d.subject.qualification_code }} {{ d.subject.name }} paper, including future uploads.</span></div>
            <button class="btn gold" (click)="buy(d.subjectBundle.id)">Unlock for <app-price [price]="d.subjectBundle.price" [regular]="d.subjectBundle.regular_price" [onSale]="d.subjectBundle.on_sale" [currency]="d.currency" /></button>
          </div>
        }
        <h2>Available papers</h2>
        <div class="tablewrap"><table>
          <thead><tr><th>Year</th><th>Paper</th><th>Access</th><th></th></tr></thead>
          <tbody>
            @for (p of d.papers; track p.id) {
              <tr>
                <td><b>{{ p.exam_year }}</b></td><td>{{ p.paper_type }}</td>
                <td>@if (p.owned) { <span class="badge owned">Owned</span> } @else if (p.price) { <app-price [price]="p.price" [regular]="p.regular_price" [onSale]="p.on_sale" [label]="p.sale_label" [currency]="d.currency" /> } @else { <span class="muted">Not sold separately</span> }</td>
                <td style="text-align:right">
                  @if (p.owned) { <a class="btn small" [routerLink]="['/view', p.id]">Open paper</a> }
                  @else if (p.product_id) { <button class="btn small ghost" (click)="buy(p.product_id)">Buy paper</button> }
                </td>
              </tr>
            } @empty { <tr><td colspan="4" class="muted">No papers uploaded yet.</td></tr> }
          </tbody>
        </table></div>
      </div>
    } @else if (missing()) { <p class="wrap">Subject not found.</p> }
  `,
})
export class Subject {
  id = input.required<string>();
  private api = inject(Api);
  private router = inject(Router);
  data = signal<any>(null);
  missing = signal(false);
  error = signal('');
  constructor() {
    effect(() => {
      const id = this.id();
      this.api.ready.then(() =>
        this.api.get(`/catalog/subjects/${id}`).subscribe({
          next: (r) => this.data.set(r), error: () => this.missing.set(true),
        }));
    });
  }
  buy(productId: number) {
    this.router.navigate(['/checkout', productId]);
  }
}
