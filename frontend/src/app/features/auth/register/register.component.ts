import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  fullName = '';
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }

  onSubmit(): void {
    if (!this.fullName.trim() || !this.email.trim() || !this.password) {
      this.errorMessage = 'Please complete all fields.';
      this.cdr.markForCheck();
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.authService
      .register({ fullName: this.fullName.trim(), email: this.email.trim(), password: this.password })
      .subscribe({
        next: () => {
          this.loading = false;
          this.cdr.detectChanges();
          this.router.navigate(['/onboarding'], { replaceUrl: true });
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.userMessage || err.error?.message || 'Registration failed. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }
}
