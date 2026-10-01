import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../api';

@Component({
  imports: [RouterLink],
  template: `
    <div class="card form" style="text-align:center;max-width:520px">
      @switch (status()) {
        @case ('paid') {
          <h1>Payment successful</h1><p>Thank you! Your purchase is now available in your account.</p>
          <a class="btn" routerLink="/my-papers">Go to My Papers</a>
        }
        @case ('pending') { <h1>Payment pending</h1><p>We are still waiting for confirmation from DPO. Check My Papers in a few minutes.</p>
          <a class="btn" routerLink="/my-papers">My Papers</a> }
        @case ('cancelled') { <h1>Payment cancelled</h1><p>No payment was taken. Your order remains unpaid.</p><a class="btn" routerLink="/">Back to papers</a> }
        @default { <h1>Payment not completed</h1><p>The payment did not go through and you have not been charged. Please try again.</p><a class="btn" routerLink="/">Back to papers</a> }
      }
    </div>
  `,
})
export class PaymentResult {
  order = input<string>();
  status = signal(this.initial());
  private api = inject(Api);
  constructor() {
    // Re-confirm with the server (which verifies with DPO); the URL alone is never trusted.
    const id = new URLSearchParams(location.search).get('order');
    if (id) this.api.ready.then(() => this.api.get(`/orders/${id}`).subscribe({ next: (r) => this.status.set(r.order.status), error: () => {} }));
  }
  private initial() { return new URLSearchParams(location.search).get('status') === 'paid' ? 'pending' : (new URLSearchParams(location.search).get('status') || 'failed'); }
}
