import { Component, inject, signal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api } from '../api';

@Component({
  imports: [RouterLink, DatePipe, CurrencyPipe],
  template: `
    <h1>My past papers</h1>
    @if (data(); as d) {
      @if (!d.papers.length) { <div class="card">You have not purchased any papers yet. <a routerLink="/">Browse papers</a></div> }
      @if (d.products.length) {
        <p class="muted">Your access: @for (p of d.products; track p.id) { <span class="badge owned">{{ p.name }}</span> }</p>
      }
      @if (d.papers.length) {
        <div class="tablewrap"><table>
          <thead><tr><th>Qualification</th><th>Subject</th><th>Year</th><th>Paper</th><th></th></tr></thead>
          <tbody>
            @for (p of d.papers; track p.id) {
              <tr><td>{{ p.qualification }}</td><td>{{ p.subject }}</td><td>{{ p.exam_year }}</td><td>{{ p.paper_type }}</td>
                <td><a class="btn small" [routerLink]="['/view', p.id]">Open</a></td></tr>
            }
          </tbody>
        </table></div>
      }
      <h2>Order history</h2>
      <div class="tablewrap"><table>
        <thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          @for (o of d.orders; track o.id) {
            <tr><td>#{{ o.id }}</td><td>{{ o.created_at | date: 'medium' }}</td>
              <td>{{ o.total | currency: o.currency : 'symbol-narrow' }}</td><td><span class="badge" [class]="'badge ' + o.status">{{ o.status }}</span></td></tr>
          } @empty { <tr><td colspan="4" class="muted">No orders yet.</td></tr> }
        </tbody>
      </table></div>
    }
  `,
})
export class MyPapers {
  data = signal<any>(null);
  constructor() { inject(Api).get('/my/papers').subscribe((r) => this.data.set(r)); }
}
