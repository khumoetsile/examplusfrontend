import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

const KEY = 'ep_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const t = localStorage.getItem(KEY);
  return next(t && req.url.startsWith('/api') ? req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : req);
};

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  private router = inject(Router);
  user = signal<any>(null);
  isAdmin = computed(() => this.user()?.role === 'admin');
  ready: Promise<void>;

  constructor() {
    this.ready = localStorage.getItem(KEY)
      ? new Promise<void>((res) =>
          this.http.get<any>('/api/auth/me').subscribe({
            next: (r) => { this.user.set(r.user); res(); },
            error: () => { localStorage.removeItem(KEY); res(); },
          }))
      : Promise.resolve();
  }

  get = <T = any>(url: string) => this.http.get<T>('/api' + url);
  post = <T = any>(url: string, body: unknown) => this.http.post<T>('/api' + url, body);
  put = <T = any>(url: string, body: unknown) => this.http.put<T>('/api' + url, body);
  del = <T = any>(url: string) => this.http.delete<T>('/api' + url);
  putForm = <T = any>(url: string, form: FormData) => this.http.put<T>('/api' + url, form);
  upload = <T = any>(url: string, form: FormData) => this.http.post<T>('/api' + url, form);
  blob = (url: string) => this.http.get('/api' + url, { responseType: 'arraybuffer' });

  login(email: string, password: string) {
    return this.post('/auth/login', { email, password }).pipe(tap((r) => this.setSession(r)));
  }
  register(name: string, email: string, password: string) {
    return this.post('/auth/register', { name, email, password }).pipe(tap((r) => this.setSession(r)));
  }
  private setSession(r: any) {
    localStorage.setItem(KEY, r.token);
    this.user.set(r.user);
  }
  logout() {
    localStorage.removeItem(KEY);
    this.user.set(null);
    this.router.navigateByUrl('/');
  }
  err = (e: any) => e?.error?.error || 'Something went wrong. Please try again.';
}
