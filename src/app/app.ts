import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { Api } from './api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="top">
      <div class="wrap bar">
        <a routerLink="/" class="brand">Elevate Skills <small>Exam Papers</small></a>
        <button class="burger" (click)="menu.set(!menu())" [attr.aria-expanded]="menu()" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
        <nav [class.open]="menu()">
          <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">Home</a>
          <a routerLink="/qualification/BGCSE" routerLinkActive="on">BGCSE</a>
          <a routerLink="/qualification/JC" routerLinkActive="on">JC</a>
          <a routerLink="/qualification/PSLE" routerLinkActive="on">PSLE</a>
          @if (api.user(); as u) {
            <a routerLink="/my-papers" routerLinkActive="on">My Papers</a>
            @if (api.isAdmin()) { <a routerLink="/admin" routerLinkActive="on">Admin</a> }
            <button class="link" (click)="api.logout()">Sign out</button>
          } @else {
            <a routerLink="/login" routerLinkActive="on">Sign in</a>
            <a routerLink="/register" class="btn small">Register</a>
          }
        </nav>
      </div>
    </header>
    <main [class.pad]="!plain()" [class.wrap]="!plain()" [class.wide]="router.url.startsWith('/admin')"><router-outlet /></main>
    <footer class="foot">
      <div class="wrap">
        <div class="cols">
          <div><b>Elevate Skills · Exam Papers</b>Botswana's online library of past BGCSE, PSLE and JC examination papers, for revision and practice.</div>
          <div><b>Explore</b><a routerLink="/qualification/BGCSE">BGCSE papers</a><a routerLink="/qualification/JC">JC papers</a><a routerLink="/qualification/PSLE">PSLE papers</a></div>
          <div><b>Account</b><a routerLink="/my-papers">My Papers</a><a routerLink="/login">Sign in</a><a href="https://elevateskills.online">elevateskills.online</a></div>
        </div>
        <div class="copy">© Elevate Skills. Past papers are for revision and practice only and are not a preview of future exams. They are available for online viewing only and may not be copied or redistributed. Payments secured by DPO.</div>
      </div>
    </footer>
  `,
})
export class App {
  api = inject(Api);
  router = inject(Router);
  menu = signal(false);
  plain = () => this.router.url === '/' || this.router.url.startsWith('/qualification') || this.router.url.startsWith('/subject');

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) { window.scrollTo(0, 0); this.menu.set(false); }
    });
    // On phones tables become stacked cards; each cell gets its column title from the header row.
    let queued = false;
    const label = () => {
      queued = false;
      document.querySelectorAll('table').forEach((t) => {
        const heads = Array.from(t.querySelectorAll('thead th')).map((h) => (h.textContent || '').trim());
        t.querySelectorAll('tbody tr').forEach((tr) => {
          Array.from(tr.children).forEach((td, i) => {
            if (heads[i] && td.getAttribute('data-label') !== heads[i]) td.setAttribute('data-label', heads[i]);
          });
        });
      });
    };
    new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(label); } })
      .observe(document.body, { childList: true, subtree: true });
  }
}
