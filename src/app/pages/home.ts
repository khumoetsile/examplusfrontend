import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../api';

@Component({
  imports: [RouterLink, FormsModule],
  template: `
    <section class="hero">
      <div class="wrap in">
        <div>
          <div class="kicker">Botswana past examination papers</div>
          <h1>Revise smarter with real past papers.</h1>
          <p>Practise with questions from previous IGCSE, BGCSE, JC and PSLE examinations, sorted by subject and year. Buy one
            paper, or open up a whole subject collection and read everything online from your account.</p>
          <p class="note">Past papers are for revision and practice. They show you the style of questions asked before and are not a
            preview of future exams.</p>
          <form class="search" (submit)="$event.preventDefault(); all()">
            <input type="search" placeholder="Search, e.g. BGCSE Biology 2024" [ngModel]="term()" (ngModelChange)="find($event)" name="q" aria-label="Search past papers" autocomplete="off">
            @if (hits(); as h) {
              @if (h.papers.length || h.subjects.length) {
                <ul>
                  @for (s of h.subjects; track s.id) { <li><a [routerLink]="['/subject', s.id]"><b>{{ s.qualification }}</b> {{ s.name }} <span class="muted">· all papers</span></a></li> }
                  @for (p of h.papers.slice(0, 5); track p.id) { <li><a [routerLink]="['/subject', p.subject_id]"><b>{{ p.qualification }}</b> {{ p.subject }} {{ p.exam_year }} <span class="muted">· {{ p.paper_type }}</span></a></li> }
                  <li class="all"><a [routerLink]="['/search']" [queryParams]="{ q: term() }">See all results →</a></li>
                </ul>
              } @else { <ul><li class="muted" style="padding:10px 14px">No papers match yet.</li></ul> }
            }
          </form>
          <div class="cta">
            <a class="btn rust" href="#qualifications">Find your papers</a>
            @if (!api.user()) { <a class="btn ghost" routerLink="/register">Create an account</a> }
            @else { <a class="btn ghost" routerLink="/my-papers">My Papers</a> }
          </div>
        </div>
        <div class="sheet" aria-hidden="true">
          <div class="hd"><span>Past paper</span><span>2024</span></div>
          <h4>BGCSE Biology</h4><div class="sub">Paper 1 · For revision</div>
          <div class="ln"></div><div class="ln"></div><div class="ln s"></div>
          <div class="q"><b>1.</b> Which organelle is the site of aerobic respiration?</div>
          <div class="ln"></div><div class="ln s"></div>
          <div class="q"><b>2.</b> State two functions of the xylem.</div>
          <div class="ln"></div>
        </div>
      </div>
    </section>

    <section class="section" id="qualifications">
      <div class="wrap">
        <div class="head"><div class="eyebrow">Start here</div><h2>Choose your qualification</h2></div>
        <div class="grid q">
          @for (q of quals(); track q.id) {
            <a class="card qcard" [class]="'card qcard c-' + q.code" [routerLink]="['/qualification', q.code]">
              <div class="code">{{ q.code }}</div>
              <p class="muted" style="margin:8px 0 0">{{ q.description }}</p>
              <span class="go">{{ q.subject_count }} subjects →</span>
            </a>
          }
        </div>
        @if (loading()) { <p class="muted">Loading…</p> }
      </div>
    </section>

    <section class="section alt">
      <div class="wrap">
        <div class="head"><div class="eyebrow">How it works</div><h2>From search to studying in minutes</h2></div>
        <div class="steps">
          <div class="step"><h3>Choose</h3><p>Pick your qualification, then your subject, or just search.</p></div>
          <div class="step"><h3>Preview</h3><p>Look at a paper's cover page before you pay.</p></div>
          <div class="step"><h3>Pay with DPO</h3><p>Your order is confirmed by the payment gateway before access is granted.</p></div>
          <div class="step"><h3>Practise online</h3><p>Open your past papers from My Papers whenever you want to revise.</p></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="head"><div class="eyebrow">Good to know</div><h2>Made for learners, priced for families</h2></div>
        <div class="feats">
          <div class="feat"><h3>Bundles cost less per paper</h3><p>Unlock a whole subject, or every paper in a qualification, for far less than buying paper by paper.</p></div>
          <div class="feat"><h3>Revise on any device</h3><p>Past papers open inside the portal on your phone, tablet or computer, tied to your account.</p></div>
          <div class="feat"><h3>Clear access period</h3><p>Every price shows how long you keep access, and your purchases stay under My Papers.</p></div>
          <div class="feat"><h3>Secure card and mobile payments</h3><p>Payments are processed by the DPO gateway.</p></div>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="wrap">
        <div class="band">
          <div><h2>Start with one paper.</h2><p>Create an account, pick your subject and start practising in minutes.</p></div>
          <a class="btn light" [routerLink]="api.user() ? '/my-papers' : '/register'">{{ api.user() ? 'My Papers' : 'Create an account' }}</a>
        </div>
      </div>
    </section>
  `,
})
export class Home {
  api = inject(Api);
  private router = inject(Router);
  quals = signal<any[]>([]);
  loading = signal(true);
  term = signal(''); hits = signal<any>(null);
  private timer: any;

  constructor() {
    this.api.get('/catalog/qualifications').subscribe((r) => { this.quals.set(r.qualifications); this.loading.set(false); });
  }
  find(v: string) {
    this.term.set(v);
    clearTimeout(this.timer);
    if (v.trim().length < 2) return this.hits.set(null);
    this.timer = setTimeout(() => {
      this.api.get('/catalog/search?q=' + encodeURIComponent(v.trim())).subscribe((r) => { if (this.term() === v) this.hits.set(r); });
    }, 200);
  }
  all() { if (this.term().trim()) this.router.navigate(['/search'], { queryParams: { q: this.term().trim() } }); }
}
