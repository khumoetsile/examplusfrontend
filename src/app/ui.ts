import { Component, Injectable, input, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

// Small toast notifications used across the admin.
@Injectable({ providedIn: 'root' })
export class Toast {
  msg = signal<{ text: string; err: boolean } | null>(null);
  private t: any;
  show(text: string, err = false) {
    this.msg.set({ text, err });
    clearTimeout(this.t);
    this.t = setTimeout(() => this.msg.set(null), err ? 6000 : 3000);
  }
  ok = (t = 'Saved') => this.show(t);
  fail = (e: any) => this.show(e?.error?.error || 'Something went wrong. Please try again.', true);
}

// Shows the current price, with the regular price struck through when a special is running.
@Component({
  selector: 'app-price',
  imports: [CurrencyPipe],
  template: `
    @if (onSale()) {
      <span class="was">{{ regular() | currency: currency() : 'symbol-narrow' : '1.2-2' }}</span>
      <span class="price now">{{ price() | currency: currency() : 'symbol-narrow' : '1.2-2' }}</span>
      @if (label()) { <span class="badge sale">{{ label() }}</span> }
    } @else {
      <span class="price">{{ price() | currency: currency() : 'symbol-narrow' : '1.2-2' }}</span>
    }
  `,
})
export class PriceTag {
  price = input.required<number>();
  regular = input<number>(0);
  onSale = input<any>(false);
  label = input<string | null | undefined>('');
  currency = input('BWP');
}

// "2026-10-01T08:00:00.000Z" -> value for <input type="datetime-local">
export const toLocalInput = (v: string | null | undefined) => {
  if (!v) return '';
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
