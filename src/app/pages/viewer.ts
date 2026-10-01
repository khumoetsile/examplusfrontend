import { Component, ElementRef, HostListener, OnDestroy, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../api';

// Online-only viewer. When the server can render pages it sends page IMAGES (the PDF itself never reaches the browser);
// otherwise the PDF is fetched with the learner's token and drawn with pdf.js. Pages are stamped with the learner's
// email, there is no download button and no public file URL. This deters casual copying; it cannot stop screenshots.
@Component({
  imports: [RouterLink],
  styles: [`
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .pages { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 12px; user-select: none; -webkit-user-select: none; }
    .slot { width: 100%; display: flex; justify-content: center; min-height: 120px; }
    canvas { max-width: 100%; height: auto !important; box-shadow: 0 2px 12px rgba(0,0,0,.15); background: #fff; pointer-events: none; }
    @media print { .pages, .bar { display: none !important; } }
  `],
  template: `
    <div class="bar">
      <div>
        <a routerLink="/my-papers">‹ My Papers</a>
        @if (meta(); as m) { <h1>{{ m.qualification }} {{ m.subject }} — {{ m.exam_year }} {{ m.paper_type }}</h1> }
      </div>
      <span class="muted">{{ progress() }}</span>
    </div>
    @if (error()) { <div class="msg err">{{ error() }}</div> }
    <div class="pages" #host (contextmenu)="$event.preventDefault()" (dragstart)="$event.preventDefault()"></div>
  `,
})
export class Viewer implements OnDestroy {
  id = input.required<string>();
  private api = inject(Api);
  host = viewChild.required<ElementRef<HTMLElement>>('host');
  meta = signal<any>(null);
  error = signal('');
  progress = signal('Loading…');
  private doc: any;
  private email = '';
  private dead = false;

  constructor() { queueMicrotask(() => this.load()); }

  private get<T>(url: string) { return new Promise<T>((res, rej) => this.api.get(url).subscribe({ next: res as any, error: rej })); }
  private bytes(url: string) { return new Promise<ArrayBuffer>((res, rej) => this.api.blob(url).subscribe({ next: res, error: rej })); }

  private async load() {
    try {
      const m: any = await this.get(`/papers/${this.id()}/meta`);
      this.meta.set(m.paper);
      this.email = m.viewer;
      const info: any = await this.get(`/papers/${this.id()}/pages`);
      if (info.mode === 'images') await this.showImages(info.count);
      else await this.showPdf();
    } catch (e: any) {
      this.error.set(e?.error?.error || 'Could not open this paper.');
      this.progress.set('');
    }
  }

  private width() { return Math.min(this.host().nativeElement.clientWidth || 800, 900); }

  // Server-rendered pages: load 3 at a time, keep them in order.
  private async showImages(count: number) {
    const host = this.host().nativeElement;
    const slots: HTMLElement[] = [];
    for (let n = 1; n <= count; n++) { const d = document.createElement('div'); d.className = 'slot'; host.appendChild(d); slots.push(d); }
    let next = 1, done = 0;
    const worker = async () => {
      while (!this.dead) {
        const n = next++;
        if (n > count) return;
        const bmp = await createImageBitmap(new Blob([await this.bytes(`/papers/${this.id()}/page/${n}`)], { type: 'image/jpeg' }));
        const canvas = document.createElement('canvas');
        canvas.width = bmp.width; canvas.height = bmp.height; canvas.style.width = `${this.width()}px`;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(bmp, 0, 0); bmp.close();
        this.stamp(ctx, canvas.width, canvas.height);
        slots[n - 1].style.minHeight = '0'; slots[n - 1].appendChild(canvas);
        this.progress.set(`${++done} of ${count} pages`);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    this.progress.set(`${count} pages`);
  }

  // Fallback when the server cannot render pages: draw the PDF with pdf.js.
  private async showPdf() {
    const buf = await this.bytes(`/papers/${this.id()}/file`);
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    this.doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    const host = this.host().nativeElement;
    const width = this.width();
    for (let n = 1; n <= this.doc.numPages && !this.dead; n++) {
      this.progress.set(`Page ${n} of ${this.doc.numPages}`);
      const page = await this.doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: (width / base.width) * (window.devicePixelRatio || 1) });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height; canvas.style.width = `${width}px`;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
      this.stamp(ctx, vp.width, vp.height);
      host.appendChild(canvas);
    }
    this.progress.set(`${this.doc.numPages} pages`);
  }

  private stamp(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#000';
    ctx.font = `${Math.round(w / 32)}px sans-serif`;
    ctx.rotate(-Math.PI / 6);
    const step = w / 4;
    for (let y = 0; y < h * 1.6; y += step)
      for (let x = -w; x < w * 1.5; x += step * 1.8) ctx.fillText(`${this.email} · Elevate Skills`, x, y);
    ctx.restore();
  }

  // Discourage save / print / copy shortcuts.
  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'c', 'u'].includes(e.key.toLowerCase())) e.preventDefault();
  }

  ngOnDestroy() { this.dead = true; this.doc?.destroy?.(); }
}
