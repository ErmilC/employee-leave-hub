import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, AuthUser } from '../../services/auth.service';
import { LeaveService } from '../../services/leave.service';
import { TranslationService } from '../../services/translation.service';
import { DemoEmail } from '../../models/leave.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Header Principal -->
    <header>
      <div class="brand-section">
        <i class="fa-solid fa-briefcase" style="color:var(--primary-color); font-size:18px;"></i>
        <span class="brand-title">{{ t('appName') }}</span>
      </div>

      <!-- Butoane Utilitare & Cadran Utilizator in Dreapta Sus -->
      <div style="display:flex; align-items:center; gap:8px;">
        <button class="btn btn-default btn-sm" (click)="toggleLanguage()" title="Schimba limba / Change language">
          <i class="fa-solid fa-globe"></i> <span>{{ (currentLang$ | async)?.toUpperCase() }}</span>
        </button>

        <button class="btn btn-default btn-sm" (click)="toggleDarkMode()" title="Comuta modul intunecat/luminos">
          <i [class]="(isDarkMode$ | async) ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i>
          <span>{{ (isDarkMode$ | async) ? t('lightModeLabel') : t('darkModeLabel') }}</span>
        </button>

        <button class="btn btn-default btn-sm" (click)="toggleDrawer()" title="Vezi e-mailurile trimise">
          <i class="fa-regular fa-envelope"></i> <span>{{ t('emailsBtn') }} ({{ notifications.length }})</span>
        </button>

        <button class="btn btn-default btn-sm" (click)="logout()" title="Deconectare" style="color:var(--badge-red-text);" *ngIf="user">
          <i class="fa-solid fa-arrow-right-from-bracket"></i> <span>{{ t('logoutBtn') }}</span>
        </button>

        <!-- Informatii Utilizator Curent (in dreapta butonului Iesire) -->
        <div class="header-user-info" *ngIf="user" style="margin-left:4px;">
          <i class="fa-regular fa-user" style="color:var(--primary-color);"></i>
          <div>
            <span class="user-name">{{ user.name }}</span>
            <span class="user-role"> ({{ getRoleLabel(user.role) }})</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Meniu Navigare Tabs -->
    <nav class="nav-bar" *ngIf="user">
      <a routerLink="/employee" routerLinkActive="active" class="tab-item">
        <i class="fa-solid fa-user"></i> <span>{{ t('tabMyRequests') }}</span>
      </a>
      
      <a *ngIf="user.role === 'DEPT_RESP' || user.role === 'ADMIN'" 
         routerLink="/manager" 
         [queryParams]="{tab: 'requests'}" 
         routerLinkActive="active" 
         [routerLinkActiveOptions]="{exact: false}"
         class="tab-item">
        <i class="fa-solid fa-tasks"></i> <span>{{ t('tabApprovals') }}</span>
      </a>

      <a *ngIf="user.role === 'DEPT_RESP' || user.role === 'ADMIN'" 
         routerLink="/manager" 
         [queryParams]="{tab: 'calendar'}" 
         class="tab-item">
        <i class="fa-regular fa-calendar-alt"></i> <span>{{ t('tabCalendar') }}</span>
      </a>

      <a *ngIf="user.role === 'ADMIN'" 
         routerLink="/admin" 
         routerLinkActive="active" 
         class="tab-item">
        <i class="fa-solid fa-cog"></i> <span>{{ t('tabAdmin') }}</span>
      </a>
    </nav>

    <!-- Overlay fundal pentru inchidere la click in exterior -->
    <div class="drawer-overlay" *ngIf="isDrawerOpen" (click)="closeDrawer()"></div>

    <!-- Drawer E-mailuri Trimise -->
    <div class="email-drawer" [class.open]="isDrawerOpen">
      <div class="drawer-head">
        <strong style="font-size:14px; display:inline-flex; align-items:center; gap:8px;">
          <i class="fa-regular fa-envelope"></i> <span>{{ t('drawerTitle') }}</span>
        </strong>
        <button style="border:none; background:none; cursor:pointer; color:var(--text-main); font-size:16px;" (click)="closeDrawer()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="drawer-content">
        <div *ngIf="notifications.length === 0" style="text-align:center; color:var(--text-muted); padding:24px;">
          {{ t('noNotifications') }}
        </div>
        <div class="email-card" *ngFor="let email of notifications">
          <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-bottom:4px;">
            <span>{{ t('fromLabel') }} <strong>{{ email.senderEmail || 'sistem@test.ro' }}</strong></span>
            <span>{{ email.sentAt | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px;">
            {{ t('toLabel') }} <strong>{{ email.recipientName }}</strong> &lt;{{ email.recipientEmail }}&gt;
          </div>
          <div style="font-weight:600; font-size:13px; color:var(--text-main);">{{ email.subject }}</div>
          <div style="font-size:12px; color:var(--text-main); margin-top:4px;">{{ email.content }}</div>
        </div>
      </div>
    </div>
  `
})
export class NavbarComponent implements OnInit, OnDestroy {
  user: AuthUser | null = null;
  notifications: DemoEmail[] = [];
  isDrawerOpen = false;

  currentLang$ = this.translationService.currentLang$;
  isDarkMode$ = this.authService.getIsDarkMode$();
  private destroy$ = new Subject<void>();

  constructor(
    public authService: AuthService,
    public leaveService: LeaveService,
    public translationService: TranslationService,
    private router: Router
  ) {}

  private loadedEmail: string | null = null;

  ngOnInit(): void {
    this.authService.getUser$().pipe(takeUntil(this.destroy$)).subscribe(u => {
      const isNewEmail = u && this.loadedEmail !== u.email;
      this.user = u;
      if (isNewEmail) {
        this.loadedEmail = u.email;
        this.loadNotifications();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isDrawerOpen) {
      this.closeDrawer();
    }
  }

  loadNotifications(): void {
    if (!this.user) return;
    this.leaveService.getNotifications(this.user.email).pipe(takeUntil(this.destroy$)).subscribe({
      next: notifs => this.notifications = notifs,
      error: () => this.notifications = []
    });
  }

  toggleDrawer(): void {
    this.isDrawerOpen = !this.isDrawerOpen;
    if (this.isDrawerOpen) {
      this.loadNotifications();
    }
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
  }

  toggleLanguage(): void {
    this.translationService.toggleLanguage();
  }

  toggleDarkMode(): void {
    this.authService.toggleDarkMode();
  }

  t(key: string): string {
    return this.translationService.t(key);
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'DEPT_RESP': return 'Manager';
      default: return 'Angajat';
    }
  }

  logout(): void {
    this.closeDrawer();
    this.authService.logout();
  }
}
