import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserPreferences } from '../../core/models/user.model';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css'],
})
export class OnboardingComponent implements OnInit {
  preferences: UserPreferences = {
    dailyAvailableHours: 3,
    preferredPeriod: 'MORNING',
    energyPeakTime: 'EARLY_DAY',
    sessionDurationMinutes: 50,
    breakDurationMinutes: 10,
  };

  saving = false;
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    const current = this.authService.currentUser();
    if (current?.preferences) {
      this.preferences = { ...this.preferences, ...current.preferences };
    }
  }

  savePreferences(): void {
    this.saving = true;
    this.authService.updatePreferences(this.preferences).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/subjects']);
      },
      error: () => {
        this.saving = false;
        this.router.navigate(['/subjects']);
      },
    });
  }
}
