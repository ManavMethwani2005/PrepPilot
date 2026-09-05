import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <div class="auth-header">
          <div class="brand-pill">
            <span class="brand-icon">⚡</span>
            <span class="brand-name">PrepPilot</span>
          </div>
          <h2>Create your PrepPilot account</h2>
          <p class="subtitle">Build a study plan you can actually follow.</p>
        </div>

        @if (errorMessage) {
          <div class="alert alert-danger" role="alert">
            <span class="alert-icon">⚠️</span>
            <span>{{ errorMessage }}</span>
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="auth-form" novalidate>
          <div class="form-group">
            <label for="reg-fullname">Full name</label>
            <input
              type="text"
              id="reg-fullname"
              [(ngModel)]="fullName"
              name="fullName"
              required
              maxlength="80"
              autocomplete="name"
              placeholder="e.g. Maya Lin"
              [disabled]="loading"
            />
          </div>

          <div class="form-group">
            <label for="reg-email">Email address</label>
            <input
              type="email"
              id="reg-email"
              [(ngModel)]="email"
              name="email"
              required
              autocomplete="email"
              placeholder="maya@university.edu"
              [disabled]="loading"
            />
          </div>

          <div class="form-group">
            <div class="label-row">
              <label for="reg-password">Password (min 6 characters)</label>
            </div>
            <div class="password-input-wrapper">
              <input
                [type]="showPassword ? 'text' : 'password'"
                id="reg-password"
                [(ngModel)]="password"
                name="password"
                required
                minlength="6"
                autocomplete="new-password"
                placeholder="••••••••"
                [disabled]="loading"
              />
              <button
                type="button"
                class="btn-toggle-password"
                (click)="showPassword = !showPassword"
                [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'"
              >
                {{ showPassword ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </div>

          <button
            type="submit"
            class="btn-primary btn-submit"
            [disabled]="loading || !fullName || !email || !password || password.length < 6"
          >
            @if (loading) {
              <span class="spinner-dot"></span>
              <span>Creating your account...</span>
            } @else {
              <span>Start Planning Free</span>
            }
          </button>
        </form>

        <div class="auth-footer">
          <p>Already have an account? <a routerLink="/login">Sign in</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: calc(100vh - 65px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem 1rem;
      background: var(--bg-main);
    }
    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 2rem 1.75rem;
      border: 1px solid var(--border);
    }
    .auth-header {
      text-align: center;
      margin-bottom: 1.75rem;
    }
    .brand-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: var(--primary-light);
      border: 1px solid var(--primary-border);
      color: var(--primary);
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-full);
      font-size: 0.8rem;
      font-weight: 700;
      margin-bottom: 0.85rem;
    }
    .auth-header h2 {
      font-size: 1.45rem;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.3px;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.88rem;
      margin-top: 0.35rem;
      line-height: 1.4;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-group label {
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--text-main);
    }
    .password-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .password-input-wrapper input {
      width: 100%;
      padding-right: 2.5rem;
    }
    .btn-toggle-password {
      position: absolute;
      right: 0.6rem;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.95rem;
      padding: 0.2rem 0.3rem;
      cursor: pointer;
    }
    .btn-submit {
      width: 100%;
      padding: 0.7rem;
      margin-top: 0.4rem;
      font-weight: 600;
      font-size: 0.92rem;
    }
    .alert {
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      font-size: 0.84rem;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .alert-danger {
      background: var(--danger-light);
      color: var(--danger-text);
      border: 1px solid var(--danger-border);
    }
    .auth-footer {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border);
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .auth-footer a {
      font-weight: 600;
    }
  `],
})
export class RegisterComponent {
  fullName = '';
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  private authService = inject(AuthService);
  private router = inject(Router);

  onSubmit(): void {
    if (!this.fullName.trim() || !this.email.trim() || !this.password) {
      this.errorMessage = 'Please complete all fields.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService
      .register({ fullName: this.fullName.trim(), email: this.email.trim(), password: this.password })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/onboarding']);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.userMessage || err.error?.message || 'Registration failed. Please try again.';
        },
      });
  }
}
