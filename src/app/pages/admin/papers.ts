import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../api';
import { Toast } from '../../ui';

interface Pending { file: File; type: string; state: 'ready' | 'uploading' | 'done' | 'error'; msg?: string }

@Component({
  imports: [FormsModule, RouterLink],
  template: `
    <h1>Exam papers</h1>
    <p class="muted">Upload PDFs, then set their prices. Papers are only ever shown to learners who have bought them.</p>

    <div class="card">
      <h3>Upload papers</h3>
      <div class="row">
        <div><label>Qualification</label>
          <select [(ngModel)]="upQual" (ngModelChange)="upSubject = null">
            <option [ngValue]="null">Choose…</option>
            @for (q of quals(); track q.id) { <option [ngValue]="q.id">{{ q.code }}</option> }
          </select></div>
        <div><label>Subject</label>
          <select [(ngModel)]="upSubject" [disabled]="!upQual">
            <option [ngValue]="null">Choose…</option>
            @for (s of subjectsFor(upQual); track s.id) { <option [ngValue]="s.id">{{ s.name }}</option> }
          </select></div>
        <div><label>Exam year</label><input type="number" [(ngModel)]="upYear" min="1990" max="2100"></div>
        <div><label>Price for each (optional)</label><input type="number" min="0" step="0.01" [(ngModel)]="upPrice" placeholder="Set later"></div>
      </div>

      <div class="drop" [class.over]="over()" (dragover)="$event.preventDefault(); over.set(true)" (dragleave)="over.set(false)" (drop)="onDrop($event)">
        <p><b>Drag PDF files here</b> or</p>
        <label class="btn ghost small" style="display:inline-block;margin:0">Choose files
          <input type="file" accept="application/pdf" multiple hidden (change)="pick($any($event.target).files); $any($event.target).value = ''"></label>
      </div>

      @if (pending().length) {
        <div class="tablewrap" style="margin-top:12px"><table>
          <thead><tr><th>File</th><th>Paper name (shown to learners)</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (p of pending(); track p.file.name + $index) {
              <tr><td>{{ p.file.name }}<br><span class="muted">{{ (p.file.size / 1048576).toFixed(1) }} MB</span></td>
                <td><input [(ngModel)]="p.type" [disabled]="p.state !== 'ready'" placeholder="e.g. Paper 1"></td>
                <td><span class="badge" [class]="'badge ' + (p.state === 'done' ? 'paid' : p.state === 'error' ? 'failed' : p.state === 'uploading' ? 'pending' : '')">{{ p.state }}</span>
                  @if (p.msg) { <br><span class="muted">{{ p.msg }}</span> }</td>
                <td><button class="btn small ghost" (click)="drop(p)" [disabled]="p.state === 'uploading'">Remove</button></td></tr>
            }
          </tbody></table></div>
        <p><button class="btn rust" (click)="uploadAll()" [disabled]="busy()">{{ busy() ? 'Uploading…' : 'Upload ' + readyCount() + ' paper(s)' }}</button></p>
      }
    </div>

    <div class="toolbar">
      <select [ngModel]="fQual()" (ngModelChange)="fQual.set($event); fSubject.set(null)"><option [ngValue]="null">All qualifications</option>
        @for (q of quals(); track q.id) { <option [ngValue]="q.id">{{ q.code }}</option> }</select>
      <select [ngModel]="fSubject()" (ngModelChange)="fSubject.set($event)"><option [ngValue]="null">All subjects</option>
        @for (s of subjectsFor(fQual()); track s.id) { <option [ngValue]="s.id">{{ s.name }}</option> }</select>
      <input type="search" placeholder="Search year or paper…" [ngModel]="q()" (ngModelChange)="q.set($event)">
      <span class="muted">{{ list().length }} papers</span>
    </div>

    <div class="tablewrap"><table>
      <thead><tr><th>Qual.</th><th>Subject</th><th>Year</th><th>Paper</th><th>Price</th><th>Status</th><th></th></tr></thead>
      <tbody>
        @for (p of list(); track p.id) {
          <tr>
            <td>{{ p.qualification }}</td><td>{{ p.subject }}</td><td>{{ p.exam_year }}</td><td>{{ p.paper_type }}</td>
            <td>@if (p.price > 0) { {{ p.price }} } @else { <span class="badge pending">No price</span> }</td>
            <td><span class="badge" [class]="'badge ' + (p.active ? 'owned' : 'revoked')">{{ p.active ? 'Live' : 'Hidden' }}</span></td>
            <td style="text-align:right;white-space:nowrap">
              <a class="btn small ghost" [routerLink]="['/view', p.id]" target="_blank">Preview</a>
              <button class="btn small" (click)="edit(p)">Edit</button>
            </td>
          </tr>
        } @empty { <tr><td colspan="7" class="muted">No papers match. Upload your first paper above.</td></tr> }
      </tbody>
    </table></div>

    @if (editing(); as e) {
      <div class="modal-bg" (click)="editing.set(null)"><div class="modal card" (click)="$event.stopPropagation()">
        <h3>Edit paper</h3>
        <label>Subject</label>
        <select [(ngModel)]="e.subject_id">@for (s of allSubjects(); track s.id) { <option [ngValue]="s.id">{{ s.qualification_code }} – {{ s.name }}</option> }</select>
        <div class="row"><div><label>Exam year</label><input type="number" [(ngModel)]="e.exam_year"></div>
          <div><label>Paper name</label><input [(ngModel)]="e.paper_type"></div></div>
        <label>Regular price</label><input type="number" min="0" step="0.01" [(ngModel)]="e.price">
        <label>Replace the PDF (optional)</label><input type="file" accept="application/pdf" (change)="replace = $any($event.target).files[0]">
        <label><input type="checkbox" [(ngModel)]="e.active"> Visible to learners</label>
        <div class="row" style="margin-top:16px">
          <button class="btn danger small" (click)="remove(e)">Delete paper</button>
          <span style="flex:1"></span>
          <button class="btn ghost" (click)="editing.set(null)">Cancel</button>
          <button class="btn" (click)="save(e)" [disabled]="busy()">Save changes</button>
        </div>
      </div></div>
    }
  `,
})
export class Papers {
  private api = inject(Api); private toast = inject(Toast);
  quals = signal<any[]>([]); allSubjects = signal<any[]>([]); papers = signal<any[]>([]);
  fQual = signal<number | null>(null); fSubject = signal<number | null>(null); q = signal('');
  list = computed(() => {
    const q = this.q().toLowerCase();
    return this.papers().filter((p) =>
      (!this.fQual() || p.qualification_id === this.fQual()) && (!this.fSubject() || p.subject_id === this.fSubject()) &&
      (!q || `${p.exam_year} ${p.paper_type} ${p.subject}`.toLowerCase().includes(q)));
  });
  upQual: number | null = null; upSubject: number | null = null; upYear = new Date().getFullYear() - 1; upPrice: number | null = null;
  pending = signal<Pending[]>([]); over = signal(false); busy = signal(false);
  editing = signal<any>(null); replace: File | null = null;
  readyCount = () => this.pending().filter((p) => p.state === 'ready').length;

  constructor() { this.reload(); }
  subjectsFor = (qid: number | null) => this.allSubjects().filter((s) => !qid || s.qualification_id === qid);
  private reload() {
    this.api.get('/admin/qualifications').subscribe((r) => this.quals.set(r));
    this.api.get('/admin/subjects').subscribe((r) => this.allSubjects.set(r));
    this.api.get('/admin/papers').subscribe((r) => this.papers.set(r));
  }

  onDrop(e: DragEvent) { e.preventDefault(); this.over.set(false); this.pick(e.dataTransfer?.files); }
  pick(files: FileList | null | undefined) {
    const add = Array.from(files || []).filter((f) => /\.pdf$/i.test(f.name))
      .map((file): Pending => ({ file, type: file.name.replace(/\.pdf$/i, '').replace(/[_+-]+/g, ' ').trim(), state: 'ready' }));
    if (!add.length) this.toast.show('Only PDF files can be uploaded.', true);
    this.pending.update((p) => [...p, ...add]);
  }
  drop(p: Pending) { this.pending.update((l) => l.filter((x) => x !== p)); }

  async uploadAll() {
    if (!this.upSubject || !this.upYear) return this.toast.show('Choose a subject and the exam year first.', true);
    this.busy.set(true);
    for (const p of this.pending().filter((x) => x.state === 'ready')) {
      p.state = 'uploading'; this.pending.update((l) => [...l]);
      const f = new FormData();
      f.append('files', p.file); f.append('subject_id', String(this.upSubject)); f.append('exam_year', String(this.upYear));
      f.append('paper_type', p.type || 'Paper 1'); if (this.upPrice) f.append('price', String(this.upPrice));
      try { await new Promise((res, rej) => this.api.upload('/admin/papers', f).subscribe({ next: res, error: rej })); p.state = 'done'; }
      catch (e: any) { p.state = 'error'; p.msg = this.api.err(e); }
      this.pending.update((l) => [...l]);
    }
    this.busy.set(false);
    const ok = this.pending().filter((p) => p.state === 'done').length;
    if (ok) this.toast.ok(`${ok} paper(s) uploaded`);
    this.pending.update((l) => l.filter((p) => p.state !== 'done'));
    this.reload();
  }

  edit(p: any) { this.replace = null; this.editing.set({ ...p, active: !!p.active }); }
  save(e: any) {
    const f = new FormData();
    f.append('subject_id', e.subject_id); f.append('exam_year', e.exam_year); f.append('paper_type', e.paper_type); f.append('active', e.active ? '1' : '0');
    if (this.replace) f.append('file', this.replace);
    this.busy.set(true);
    this.api.putForm(`/admin/papers/${e.id}`, f).subscribe({
      next: () => {
        const done = () => { this.busy.set(false); this.editing.set(null); this.toast.ok('Paper saved'); this.reload(); };
        if (e.product_id) this.api.put(`/admin/products/${e.product_id}/price`, { price: e.price ?? 0 }).subscribe({ next: done, error: (x) => { this.busy.set(false); this.toast.fail(x); } });
        else done();
      },
      error: (x) => { this.busy.set(false); this.toast.fail(x); },
    });
  }
  remove(e: any) {
    if (!confirm('Delete this paper and its PDF? Learners who bought it will lose access to it.')) return;
    this.api.del(`/admin/papers/${e.id}`).subscribe({ next: () => { this.editing.set(null); this.toast.ok('Paper deleted'); this.reload(); }, error: (x) => this.toast.fail(x) });
  }
}
