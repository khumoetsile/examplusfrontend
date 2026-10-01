import { Component, ElementRef, Injectable, Pipe, PipeTransform, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Api } from './api';

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

// 365 -> "12 months access", empty -> "Lifetime access"
export const accessText = (d: number | null | undefined) => {
  if (!d) return 'Lifetime access';
  if (d >= 360 && d <= 370) return '12 months access';
  if (d >= 725 && d <= 735) return '24 months access';
  if (d % 30 === 0) return `${d / 30} month${d / 30 > 1 ? 's' : ''} access`;
  return `${d} days access`;
};
@Pipe({ name: 'access' })
export class AccessPipe implements PipeTransform {
  transform = accessText;
}

// "2026-10-01T08:00:00.000Z" -> value for <input type="datetime-local">
export const toLocalInput = (v: string | null | undefined) => {
  if (!v) return '';
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

// Cover-page preview shown before purchase. Only page 1 of the paper is ever sent by the server.
@Component({
  selector: 'app-cover-preview',
  template: `
    <div class="modal-bg" (click)="closed.emit()">
      <div class="modal card preview" (click)="$event.stopPropagation()" role="dialog" aria-label="Cover page preview">
        <div class="row" style="align-items:center;flex-wrap:nowrap;margin-bottom:8px">
          <h3 style="margin:0;flex:1">{{ title() }}</h3>
          <button class="btn small ghost" (click)="closed.emit()" style="flex:0 0 auto" aria-label="Close">Close</button>
        </div>
        <p class="muted" style="margin:0 0 10px;font-size:.88rem">Cover page preview. Buy this paper to read all of it.</p>
        <div class="pv-stage" #stage (contextmenu)="$event.preventDefault()">
          @if (loading()) { <p class="muted" style="text-align:center;padding:40px 0">Loading preview…</p> }
          @if (error()) { <div class="msg err">{{ error() }}</div> }
        </div>
        <div class="pv-actions"><ng-content /></div>
      </div>
    </div>
  `,
  styles: [`
    .preview { max-width: 640px; }
    .pv-stage { display: flex; justify-content: center; user-select: none; -webkit-user-select: none; }
    .pv-stage canvas { max-width: 100%; height: auto !important; border: 1px solid var(--line); background: #fff; pointer-events: none; }
    .pv-actions { margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap; }
    .pv-actions:empty { display: none; }
  `],
})
export class CoverPreview {
  paperId = input.required<number>();
  title = input('Preview');
  closed = output<void>();
  private api = inject(Api);
  stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  loading = signal(true); error = signal('');

  constructor() {
    effect(() => { const id = this.paperId(); queueMicrotask(() => this.render(id)); });
  }

  private async render(id: number) {
    this.loading.set(true); this.error.set('');
    try {
      const buf: ArrayBuffer = await new Promise((res, rej) => this.api.blob(`/papers/${id}/cover`).subscribe({ next: res, error: rej }));
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
      const page = await doc.getPage(1);
      const host = this.stage().nativeElement;
      const width = Math.min(host.clientWidth || 560, 560);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: (width / base.width) * (window.devicePixelRatio || 1) });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height; canvas.style.width = `${width}px`;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
      ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = '#000'; ctx.font = `bold ${Math.round(vp.width / 9)}px sans-serif`; ctx.rotate(-Math.PI / 6);
      for (let y = vp.height * 0.2; y < vp.height * 1.4; y += vp.width / 2.2) ctx.fillText('PREVIEW', vp.width * 0.05, y);
      ctx.restore();
      host.querySelectorAll('canvas').forEach((c) => c.remove());
      host.appendChild(canvas);
      (doc as any).destroy?.();
    } catch (e: any) {
      this.error.set(e?.error?.error || 'A preview is not available for this paper.');
    }
    this.loading.set(false);
  }
}
