import { Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../api';
import { PriceTag } from '../ui';

@Component({
  imports: [RouterLink, PriceTag],
  template: `
    @if (data(); as d) {
      <div class="pagehead"><div class="wrap">
        <div class="crumbs"><a routerLink="/">Exam papers</a> › {{ d.qualification.name }}</div>
        <h1>{{ d.qualification.name }} past papers</h1>
        <p>{{ d.qualification.description }}</p>
      </div></div>
      <div class="wrap" style="padding:28px 20px 56px">
        @if (d.bundle) {
          <div class="card promo blue">
            <div><b style="font-size:1.15rem">Unlock all {{ d.qualification.name }} papers</b><br>
              <span class="muted">Every available paper across all subjects, best value.</span></div>
            <button class="btn" (click)="buy(d.bundle.id)">Buy for <app-price [price]="d.bundle.price" [regular]="d.bundle.regular_price" [onSale]="d.bundle.on_sale" [currency]="d.currency" /></button>
          </div>
        }
        @if (error()) { <div class="msg err">{{ error() }}</div> }
        <h2>Choose a subject</h2>
        <div class="grid">
          @for (s of d.subjects; track s.id) {
            <a class="card subj" [routerLink]="['/subject', s.id]">
              <div><h3>{{ s.name }}</h3><span class="muted">{{ s.paper_count }} papers</span></div><span class="arrow">→</span></a>
          } @empty { <p class="muted">No subjects yet.</p> }
        </div>
      </div>
    } @else if (missing()) { <p class="wrap">Qualification not found.</p> }
  `,
})
export class Qualification {
  code = input.required<string>();
  private api = inject(Api);
  private router = inject(Router);
  data = signal<any>(null);
  missing = signal(false);
  error = signal('');
  constructor() {
    effect(() => {
      this.data.set(null); this.missing.set(false);
      this.api.get(`/catalog/qualifications/${this.code()}`).subscribe({
        next: (r) => this.data.set(r), error: () => this.missing.set(true),
      });
    });
  }
  buy(productId: number) {
    this.router.navigate(['/checkout', productId]);
  }
}
