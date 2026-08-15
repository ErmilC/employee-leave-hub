import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface AuthUser {
  token: string;
  emplId: number;
  name: string;
  email: string;
  role: 'USER' | 'DEPT_RESP' | 'ADMIN';
  deptId: number;
  annualLeaveDays: number;
  availableLeaveDays: number;
  expiresAt?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = (typeof window !== 'undefined' && window.location.port === '4200' && window.location.hostname === 'localhost')
    ? 'http://localhost:8080/api'
    : '/api';

  private currentUser$ = new BehaviorSubject<AuthUser | null>(null);
  private isDarkMode$ = new BehaviorSubject<boolean>(false);

  // Sliding Session & Inactivity Warning
  public showSessionWarning$ = new BehaviorSubject<boolean>(false);
  public warningCountdown$ = new BehaviorSubject<number>(60);

  private readonly SESSION_DURATION_SECONDS = 15 * 60; // 15 minute
  private readonly WARNING_THRESHOLD_SECONDS = 60;     // Avertisment in ultimele 60 de secunde
  private readonly ACTIVITY_THROTTLE_MS = 20 * 1000;    // Reinnoire automata la cel mult 20 secunde de activitate
  private lastActivityRenewal = 0;
  private timerInterval: any = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone
  ) {
    if (typeof window !== 'undefined') {
      // Curatare localStorage vechi
      localStorage.removeItem('leavehub_user');

      // Restaurare tema (Light / Dark)
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        this.isDarkMode$.next(true);
        document.body.classList.add('dark-mode');
      }

      // Restaurare sesiune din cookie (daca nu a expirat)
      this.restoreSessionFromCookie();

      // Pornire ascultatori de activitate pentru sliding session
      this.initActivityListeners();

      // Pornire timer principal de verificare sesiune
      this.startSessionTimer();
    }
  }

  private setCookie(name: string, value: string, maxAgeSeconds: number): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
  }

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  }

  private deleteCookie(name: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; max-age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  private restoreSessionFromCookie(): void {
    const raw = this.getCookie('leavehub_user');
    if (!raw) return;

    try {
      const user: AuthUser = JSON.parse(raw);
      const now = Date.now();

      if (user && user.expiresAt && user.expiresAt > now) {
        this.currentUser$.next(user);
      } else {
        this.deleteCookie('leavehub_user');
      }
    } catch {
      this.deleteCookie('leavehub_user');
    }
  }

  private initActivityListeners(): void {
    if (typeof window === 'undefined') return;

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    // Rulam in afara Angular Zone pentru performanta maxima
    this.ngZone.runOutsideAngular(() => {
      activityEvents.forEach(eventType => {
        window.addEventListener(eventType, () => {
          this.handleUserActivity();
        }, { passive: true });
      });
    });
  }

  private handleUserActivity(): void {
    const user = this.currentUser$.value;
    if (!user) return;

    // Daca utilizatorul interactioneaza si avertismentul nu este afisat, reinnoim la fiecare interval throttled
    const now = Date.now();
    if (now - this.lastActivityRenewal > this.ACTIVITY_THROTTLE_MS) {
      this.lastActivityRenewal = now;
      this.ngZone.run(() => {
        // Daca nu suntem deja in zona critica de avertisment, prelungim silentios
        if (!this.showSessionWarning$.value) {
          this.extendSession(false);
        }
      });
    }
  }

  private startSessionTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.ngZone.runOutsideAngular(() => {
      this.timerInterval = setInterval(() => {
        const user = this.currentUser$.value;
        if (!user) {
          if (this.showSessionWarning$.value) {
            this.ngZone.run(() => this.showSessionWarning$.next(false));
          }
          return;
        }

        const now = Date.now();
        const expiresAt = user.expiresAt || (now + this.SESSION_DURATION_SECONDS * 1000);
        const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));

        if (remainingSeconds <= 0) {
          this.ngZone.run(() => {
            this.showSessionWarning$.next(false);
            this.logout();
          });
        } else if (remainingSeconds <= this.WARNING_THRESHOLD_SECONDS) {
          this.ngZone.run(() => {
            this.showSessionWarning$.next(true);
            this.warningCountdown$.next(remainingSeconds);
          });
        } else {
          if (this.showSessionWarning$.value) {
            this.ngZone.run(() => this.showSessionWarning$.next(false));
          }
        }
      }, 1000);
    });
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(user => {
        const expiresAt = Date.now() + this.SESSION_DURATION_SECONDS * 1000;
        const userWithExpiry: AuthUser = { ...user, expiresAt };

        this.setCookie('leavehub_user', JSON.stringify(userWithExpiry), this.SESSION_DURATION_SECONDS);
        this.currentUser$.next(userWithExpiry);
        this.lastActivityRenewal = Date.now();
        this.showSessionWarning$.next(false);
      })
    );
  }

  logout(): void {
    this.deleteCookie('leavehub_user');
    this.currentUser$.next(null);
    this.showSessionWarning$.next(false);
    this.router.navigate(['/login']);
  }

  extendSession(refreshBackendToken: boolean = true): void {
    const user = this.currentUser$.value;
    if (!user) return;

    const expiresAt = Date.now() + this.SESSION_DURATION_SECONDS * 1000;
    const userWithExpiry: AuthUser = { ...user, expiresAt };

    this.setCookie('leavehub_user', JSON.stringify(userWithExpiry), this.SESSION_DURATION_SECONDS);
    this.currentUser$.next(userWithExpiry);
    this.showSessionWarning$.next(false);
    this.lastActivityRenewal = Date.now();

    if (refreshBackendToken) {
      this.refreshUser();
    }
  }

  getUser(): AuthUser | null {
    return this.currentUser$.value;
  }

  getUser$(): Observable<AuthUser | null> {
    return this.currentUser$.asObservable();
  }

  isLoggedIn(): boolean {
    const user = this.currentUser$.value;
    if (!user) return false;
    if (user.expiresAt && user.expiresAt <= Date.now()) {
      this.logout();
      return false;
    }
    return true;
  }

  refreshUser(): void {
    const user = this.getUser();
    if (!user) return;
    this.http.get<AuthUser>(`${this.apiUrl}/auth/me`).subscribe({
      next: updated => {
        const expiresAt = Date.now() + this.SESSION_DURATION_SECONDS * 1000;
        const userWithExpiry: AuthUser = { ...updated, expiresAt };

        this.setCookie('leavehub_user', JSON.stringify(userWithExpiry), this.SESSION_DURATION_SECONDS);
        this.currentUser$.next(userWithExpiry);
      }
    });
  }

  getIsDarkMode$(): Observable<boolean> {
    return this.isDarkMode$.asObservable();
  }

  toggleDarkMode(): void {
    const nextDark = !this.isDarkMode$.value;
    this.isDarkMode$.next(nextDark);
    if (typeof window !== 'undefined') {
      if (nextDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
      }
    }
  }
}
