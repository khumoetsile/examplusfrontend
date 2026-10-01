import { Component, effect, inject, input, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../api';
import { AccessPipe, PriceTag } from '../ui';

@Component({
  imports: [FormsModule, CurrencyPipe, PriceTag, RouterLink, AccessPipe],
  template: `
    <div class="pagehead"><div class="wrap"><div class="crumbs"><a routerLink="/">Exam papers</a> › Checkout</div><h1>Checkout</h1></div></div>
    <div class="wrap" style="padding:28px 20px 56px">
      @if (item(); as p) {
        <div class="checkout">
          <div class="card">
            <h2 style="margin-top:0">Your order</h2>
            <div class="line"><span>{{ p.name }}</span><app-price [price]="p.price" [regular]="p.regular_price" [onSale]="p.on_sale" [label]="p.sale_label" [currency]="currency()" /></div>

            <label for="v">Have a voucher code?</label>
            <div class="row" style="flex-wrap:nowrap">
              <input id="v" [(ngModel)]="code" placeholder="Enter code" (keyup.enter)="apply()" style="text-transform:uppercase">
              <button class="btn ghost" (click)="apply()" [disabled]="!code.trim() || busy()">Apply</button>
            </div>
            @if (voucherErr()) { <div class="msg err">{{ voucherErr() }}</div> }
            @if (quote(); as q) { <div class="msg ok">Voucher <b>{{ q.code }}</b> applied{{ q.description ? ': ' + q.description : '' }}.</div> }

            <div class="totals">
              <div class="line"><span>Subtotal</span><span>{{ p.price | currency: currency() : 'symbol-narrow' : '1.2-2' }}</span></div>
              @if (quote(); as q) { <div class="line disc"><span>Discount</span><span>−{{ q.discount | currency: currency() : 'symbol-narrow' : '1.2-2' }}</span></div> }
              <div class="line total"><span>Total</span><span>{{ total() | currency: currency() : 'symbol-narrow' : '1.2-2' }}</span></div>
            </div>
            @if (error()) { <div class="msg err">{{ error() }}</div> }
            <button class="btn rust" style="width:100%;padding:14px" (click)="pay()" [disabled]="busy()">
              {{ total() <= 0 ? 'Get your paper for free' : 'Pay securely with DPO' }}
            </button>
            <p class="muted" style="font-size:.85rem;margin-bottom:0">You will be taken to the DPO payment page. Access is granted as soon as the payment is confirmed.</p>
          </div>
          <aside class="card" style="background:transparent">
            <h3>What you get</h3>
            @if (item(); as it) { <p style="margin:6px 0"><span class="badge">{{ it.access_days | access }}</span></p> }
            <p class="muted" style="margin-top:6px">Online access to these past papers from your account, on any device, for revision and practice. Papers are view-only and cannot be downloaded.</p>
          </aside>
        </div>
      } @else if (missing()) { <div class="msg err">This item is not available for purchase.</div> }
    </div>
  `,
})
export class Checkout {
  id = input.required<string>();
  private api = inject(Api);
  private router = inject(Router);
  item = signal<any>(null); currency = signal('BWP'); missing = signal(false);
  code = ''; quote = signal<any>(null); voucherErr = signal(''); error = signal(''); busy = signal(false);
  total = () => (this.quote() ? this.quote().total : this.item()?.price ?? 0);

  constructor() {
    effect(() => {
      this.api.get(`/catalog/products/${this.id()}`).subscribe({
        next: (r) => { this.item.set(r.product); this.currency.set(r.currency); },
        error: () => this.missing.set(true),
      });
    });
  }

  apply() {
    this.voucherErr.set(''); this.quote.set(null); this.busy.set(true);
    this.api.post('/vouchers/validate', { code: this.code, productIds: [Number(this.id())] }).subscribe({
      next: (q) => { this.quote.set(q); this.busy.set(false); },
      error: (e) => { this.voucherErr.set(this.api.err(e)); this.busy.set(false); },
    });
  }

  pay() {
    this.busy.set(true); this.error.set('');
    this.api.post('/orders', { productIds: [Number(this.id())], voucherCode: this.quote()?.code }).subscribe({
      next: (r) => { if (r.free) this.router.navigateByUrl(r.payUrl); else window.location.href = r.payUrl; },
      error: (e) => { this.error.set(this.api.err(e)); this.busy.set(false); },
    });
  }
}
