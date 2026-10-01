import { Component, ElementRef, HostListener, OnDestroy, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../api';

// Online-only viewer: the PDF is fetched with the learner's token, rendered to canvases (no download button,
// no direct file URL), and stamped with the learner's email. Deters casual copying; it cannot stop screenshots.
@Component({
  imports: [RouterLink],
  styles: [`
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .pages { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 12px; user-select: none; -webkit-user-select: none; }
    canvas { max-width: 100%; height: auto !important; box-shadow: 0 2px 12px rgba(0,0,0,.15); background: #fff; pointer-events: none; }
    @media print { .pages, .bar { display: none !important; } .noprint::before { content: 'Printing is disabled.'; } }
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
    <div class="noprint"></div>
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

  constructor() { queueMicrotask(() => this.load()); }

  private async load() {
    try {
      const m: any = await new Promise((res, rej) => this.api.get(`/papers/${this.id()}/meta`).subscribe({ next: res, error: rej }));
      this.meta.set(m.paper);
      this.email = m.viewer;
      const buf: ArrayBuffer = await new Promise((res, rej) => this.api.blob(`/papers/${this.id()}/file`).subscribe({ next: res, error: rej }));
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      this.doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
      const host = this.host().nativeElement;
      const width = Math.min(host.clientWidth || 800, 900);
      for (let n = 1; n <= this.doc.numPages; n++) {
        this.progress.set(`Page ${n} of ${this.doc.numPages}`);
        const page = await this.doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const scale = (width / base.width) * (window.devicePixelRatio || 1);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width; canvas.height = vp.height;
        canvas.style.width = `${width}px`;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
        this.stamp(ctx, vp.width, vp.height);
        host.appendChild(canvas);
      }
      this.progress.set(`${this.doc.numPages} pages`);
    } catch (e: any) {
      this.error.set(e?.error?.error || 'Could not open this paper.');
      this.progress.set('');
    }
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

  ngOnDestroy() { this.doc?.destroy(); }
}
