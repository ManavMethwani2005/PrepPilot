import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="navbar">
      <div class="nav-container">
        <!-- Brand -->
        <a routerLink="/dashboard" class="brand" (click)="closeMobileMenu()">
          <span class="brand-icon">⚡</span>
          <span class="brand-name">PrepPilot</span>
          <span class="tagline-badge">AI Co-Pilot</span>
        </a>

        @if (authService.isAuthenticated()) {
          <!-- Desktop Navigation Links -->
          <nav class="nav-links desktop-only" aria-label="Main Navigation">
            <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
              Today
            </a>
            <a routerLink="/timetable" routerLinkActive="active">
              Schedule
            </a>
            <a routerLink="/subjects" routerLinkActive="active">
              Subjects
            </a>
            <a routerLink="/onboarding" routerLinkActive="active">
              Preferences
            </a>
          </nav>

          <!-- Desktop User Actions -->
          <div class="user-actions desktop-only">
            <div class="user-pill">
              <span class="avatar-dot" aria-hidden="true"></span>
              <span class="user-name">{{ authService.currentUser()?.fullName || 'Student' }}</span>
            </div>
            <button class="logout-btn" (click)="onLogout()" title="Sign out of PrepPilot">
              Sign Out
            </button>
          </div>

          <!-- Mobile Menu Button -->
          <button
            class="mobile-toggle"
            (click)="toggleMobileMenu()"
            [attr.aria-expanded]="mobileMenuOpen"
            aria-label="Toggle navigation menu"
          >
            @if (mobileMenuOpen) {
              <span>✕</span>
            } @else {
              <span>☰</span>
            }
          </button>
        } @else {
          <!-- Guest Navigation -->
          <div class="auth-buttons">
            <a routerLink="/login" class="btn-text">Sign In</a>
            <a routerLink="/register" class="btn-signup">Get Started</a>
          </div>
        }
      </div>

      <!-- Mobile Dropdown Menu -->
      @if (authService.isAuthenticated() && mobileMenuOpen) {
        <div class="mobile-nav" (click)="closeMobileMenu()">
          <div class="mobile-user-row">
            <span class="avatar-dot" aria-hidden="true"></span>
            <span class="mobile-user-name">{{ authService.currentUser()?.fullName || 'Student' }}</span>
          </div>

          <nav class="mobile-links" aria-label="Mobile Navigation">
            <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
              📅 Today
            </a>
            <a routerLink="/timetable" routerLinkActive="active">
              🗓️ Schedule
            </a>
            <a routerLink="/subjects" routerLinkActive="active">
              📚 Subjects
            </a>
            <a routerLink="/onboarding" routerLinkActive="active">
              ⚙️ Preferences
            </a>
          </nav>

          <div class="mobile-footer">
            <button class="mobile-logout-btn" (click)="onLogout()">
              Sign Out
            </button>
          </div>
        </div>
      }
    </header>
  `,
  styles: [`
    .navbar {
      background: #ffffff;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 50;
      box-shadow: var(--shadow-xs);
    }
    .nav-container {
      max-width: 1140px;
      margin: 0 auto;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    @media (min-width: 768px) {
      .nav-container {
        padding: 0.85rem 1.5rem;
      }
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      text-decoration: none;
      color: var(--text-main);
    }
    .brand-icon {
      font-size: 1.25rem;
    }
    .brand-name {
      font-weight: 700;
      font-size: 1.15rem;
      letter-spacing: -0.3px;
      color: var(--text-main);
    }
    .tagline-badge {
      background: var(--primary-light);
      color: var(--primary);
      border: 1px solid var(--primary-border);
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-full);
      letter-spacing: 0.2px;
      margin-left: 0.15rem;
    }
    .nav-links {
      display: flex;
      gap: 1.25rem;
    }
    .nav-links a {
      color: var(--text-muted);
      font-weight: 500;
      font-size: 0.9rem;
      text-decoration: none;
      padding: 0.35rem 0.65rem;
      border-radius: var(--radius-sm);
      transition: all 0.15s ease;
    }
    .nav-links a:hover {
      color: var(--text-main);
      background-color: var(--bg-subtle);
    }
    .nav-links a.active {
      color: var(--primary);
      background-color: var(--primary-light);
      font-weight: 600;
    }
    .user-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      background: var(--bg-subtle);
      padding: 0.3rem 0.65rem;
      border-radius: var(--radius-full);
      font-size: 0.82rem;
      font-weight: 500;
      color: var(--text-main);
      border: 1px solid var(--border);
    }
    .avatar-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--success);
    }
    .logout-btn {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 0.32rem 0.7rem;
      font-size: 0.8rem;
      border-radius: var(--radius-md);
      transition: all 0.15s ease;
    }
    .logout-btn:hover {
      background: var(--danger-light);
      color: var(--danger);
      border-color: var(--danger-border);
    }
    .auth-buttons {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .btn-text {
      color: var(--text-muted);
      font-weight: 500;
      font-size: 0.88rem;
      padding: 0.4rem 0.6rem;
    }
    .btn-text:hover {
      color: var(--text-main);
    }
    .btn-signup {
      background: var(--primary);
      color: #ffffff;
      padding: 0.45rem 0.95rem;
      border-radius: var(--radius-md);
      font-weight: 500;
      font-size: 0.88rem;
      text-decoration: none;
    }
    .btn-signup:hover {
      background: var(--primary-hover);
      text-decoration: none;
    }
    /* Mobile responsive rules */
    .mobile-toggle {
      display: none;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-main);
      font-size: 1.1rem;
      padding: 0.35rem 0.65rem;
      border-radius: var(--radius-md);
    }
    .desktop-only {
      display: flex;
    }
    @media (max-width: 768px) {
      .desktop-only {
        display: none !important;
      }
      .mobile-toggle {
        display: inline-flex;
      }
    }
    /* Mobile Drawer */
    .mobile-nav {
      background: #ffffff;
      border-top: 1px solid var(--border);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      box-shadow: var(--shadow-md);
    }
    .mobile-user-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.5rem;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-main);
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.6rem;
    }
    .mobile-links {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .mobile-links a {
      padding: 0.6rem 0.75rem;
      border-radius: var(--radius-md);
      color: var(--text-main);
      font-weight: 500;
      font-size: 0.92rem;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .mobile-links a.active {
      background: var(--primary-light);
      color: var(--primary);
      font-weight: 600;
    }
    .mobile-footer {
      border-top: 1px solid var(--border);
      padding-top: 0.75rem;
    }
    .mobile-logout-btn {
      width: 100%;
      background: var(--danger-light);
      color: var(--danger);
      border: 1px solid var(--danger-border);
      padding: 0.55rem;
      border-radius: var(--radius-md);
      font-weight: 500;
      font-size: 0.88rem;
    }
  `],
})
export class NavbarComponent {
  authService = inject(AuthService);
  mobileMenuOpen = false;

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  onLogout(): void {
    this.closeMobileMenu();
    this.authService.logout();
  }
}
