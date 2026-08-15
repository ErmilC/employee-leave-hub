import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-icon">
            <i class="fa-solid fa-briefcase"></i>
          </div>
          <h1>{{ t('loginTitle') }}</h1>
        </div>

        <div class="login-error" *ngIf="errorMessage">
          <i class="fa-solid fa-circle-exclamation"></i> {{ errorMessage }}
        </div>

        <form (ngSubmit)="onLogin()">
          <div class="form-group">
            <label class="form-label" for="email">{{ t('emailLabel') }}</label>
            <input type="email" id="email" class="form-control" [(ngModel)]="email" name="email" [placeholder]="t('emailPlaceholder')" required autocomplete="username">
          </div>

          <div class="form-group">
            <label class="form-label" for="password">{{ t('passwordLabel') }}</label>
            <input type="password" id="password" class="form-control" [(ngModel)]="password" name="password" [placeholder]="t('passwordPlaceholder')" required autocomplete="current-password">
          </div>

          <div style="margin-top: 24px;">
            <button type="submit" class="btn btn-primary btn-lg" style="width:100%;" [disabled]="loading">
              <span *ngIf="!loading"><i class="fa-solid fa-right-to-bracket"></i> {{ t('loginBtn') }}</span>
              <span *ngIf="loading">{{ t('loggingIn') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent implements OnDestroy {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private translationService: TranslationService,
    private router: Router
  ) {
    if (this.authService.isLoggedIn()) {
      this.navigateByRole(this.authService.getUser()!.role);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onLogin(): void {
    if (!this.email || !this.password) {
      this.errorMessage = this.t('loginEmptyErr');
      return;
    }
    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.email, this.password).pipe(takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        this.loading = false;
        this.navigateByRole(user.role);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.t('loginInvalidErr');
      }
    });
  }

  private navigateByRole(role: string): void {
    switch (role) {
      case 'ADMIN':
        this.router.navigate(['/admin']);
        break;
      case 'DEPT_RESP':
        this.router.navigate(['/manager']);
        break;
      default:
        this.router.navigate(['/employee']);
        break;
    }
  }

  t(key: string): string {
    return this.translationService.t(key);
  }
}
