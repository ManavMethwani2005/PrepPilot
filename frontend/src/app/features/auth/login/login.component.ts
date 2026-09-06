import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }

  clearError(): void {
    if (this.errorMessage) {
      this.errorMessage = '';
    }
  }

  onSubmit(): void {
    if (!this.email.trim() || !this.password) {
      this.errorMessage = 'Please enter both email and password.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login({ email: this.email.trim(), password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        this.errorMessage = '';
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 0 || err.status >= 500) {
          this.errorMessage = 'Unable to connect to the server. Please try again.';
        } else if (err.status === 401) {
          this.errorMessage = err.error?.message || err.userMessage || 'Invalid email or password.';
        } else {
          this.errorMessage = err.error?.message || err.userMessage || 'Invalid email or password.';
        }
      },
    });
  }
}
