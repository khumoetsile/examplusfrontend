import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from '../api';

@Component({
  imports: [FormsModule, RouterLink],
  template: `
    <form class="card form" (ngSubmit)="submit()" #f="ngForm">
      <h1>{{ register ? 'Create your account' : 'Sign in' }}</h1>
      @if (register) {
        <label for="n">Full name</label><input id="n" name="name" [(ngModel)]="name" required autocomplete="name">
      }
      <label for="e">Email</label><input id="e" name="email" type="email" [(ngModel)]="email" required autocomplete="email">
      <label for="p">Password</label><input id="p" name="password" type="password" [(ngModel)]="password" required minlength="8"
        [autocomplete]="register ? 'new-password' : 'current-password'">
      @if (register) { <small class="muted">At least 8 characters.</small> }
      @if (error()) { <div class="msg err">{{ error() }}</div> }
      <p><button class="btn" style="width:100%" [disabled]="busy() || f.invalid">{{ register ? 'Create account' : 'Sign in' }}</button></p>
      <p class="muted">
        @if (register) { Already registered? <a routerLink="/login" [queryParams]="route.snapshot.queryParams">Sign in</a> }
        @else { New here? <a routerLink="/register" [queryParams]="route.snapshot.queryParams">Create an account</a> }
      </p>
    </form>
  `,
})
export class Auth {
  private api = inject(Api);
  private router = inject(Router);
  route = inject(ActivatedRoute);
  register = this.route.snapshot.data['mode'] === 'register';
  name = ''; email = ''; password = '';
  error = signal(''); busy = signal(false);

  submit() {
    this.busy.set(true); this.error.set('');
    const obs = this.register ? this.api.register(this.name, this.email, this.password) : this.api.login(this.email, this.password);
    obs.subscribe({
      next: () => this.router.navigateByUrl(this.route.snapshot.queryParams['next'] || '/'),
      error: (e) => { this.error.set(this.api.err(e)); this.busy.set(false); },
    });
  }
}
