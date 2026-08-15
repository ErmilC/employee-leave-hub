import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { AuthService } from './services/auth.service';
import { TranslationService } from './services/translation.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, CommonModule],
  template: `
    <app-navbar *ngIf="authService.isLoggedIn()"></app-navbar>
    <router-outlet></router-outlet>

    <!-- Modal Avertisment Inactivitate Sesiune -->
    <div class="modal-overlay active" *ngIf="authService.showSessionWarning$ | async" style="z-index: 9999;">
      <div class="modal-box" style="max-width: 440px; text-align: center; padding: 28px 24px;">
        <div style="font-size: 2.75rem; color: #f59e0b; margin-bottom: 12px;">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; color: var(--text-main);">
          {{ translationService.t('sessionWarningTitle') }}
        </h3>
        <p style="color: var(--text-muted); margin-bottom: 16px; font-size: 0.92rem; line-height: 1.5;">
          {{ translationService.t('sessionWarningText') }}
        </p>
        <div style="font-size: 2.5rem; font-weight: 800; color: #dc2626; margin-bottom: 24px; font-family: monospace; letter-spacing: 1px;">
          {{ authService.warningCountdown$ | async }}s
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="btn btn-primary" (click)="authService.extendSession()" style="padding: 10px 20px; font-weight: 600;">
            <i class="fa-solid fa-arrows-rotate"></i> {{ translationService.t('sessionStayBtn') }}
          </button>
          <button class="btn btn-secondary" (click)="authService.logout()" style="padding: 10px 16px;">
            <i class="fa-solid fa-right-from-bracket"></i> {{ translationService.t('sessionLogoutBtn') }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class AppComponent {
  constructor(
    public authService: AuthService,
    public translationService: TranslationService
  ) {}
}
