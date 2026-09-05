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
  template: `
    <div class="container onboarding-container">
      <div class="header-section">
        <span class="step-chip">Step 1 of 2: Study Habits</span>
        <h2>Personalize Your Study Rhythm</h2>
        <p class="subtitle">PrepPilot creates a realistic schedule built around your natural focus hours and prevents burnout.</p>
      </div>

      <div class="card onboarding-card">
        <form (ngSubmit)="savePreferences()">
          <!-- Section 1: Daily Study Capacity -->
          <div class="section-block">
            <div class="section-title-row">
              <div class="num-badge">1</div>
              <div>
                <div class="pref-label-row">
                  <label for="dailyHours" class="block-title">Daily Study Capacity</label>
                  <span class="capacity-badge">{{ preferences.dailyAvailableHours }} hours / day</span>
                </div>
                <p class="block-hint">How many hours can you realistically dedicate each day without exhaustion?</p>
              </div>
            </div>

            <div class="slider-wrapper">
              <input
                type="range"
                id="dailyHours"
                name="dailyHours"
                min="0.5"
                max="10"
                step="0.5"
                [(ngModel)]="preferences.dailyAvailableHours"
                class="range-slider"
                [attr.aria-valuenow]="preferences.dailyAvailableHours"
                aria-valuemin="0.5"
                aria-valuemax="10"
                aria-label="Daily study hours"
              />
              <div class="slider-ticks" aria-hidden="true">
                <span>1 hr (Light)</span>
                <span>3 - 4 hrs (Recommended)</span>
                <span>8+ hrs (Exam Sprint)</span>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Section 2: Preferred Study Period -->
          <div class="section-block">
            <div class="section-title-row">
              <div class="num-badge">2</div>
              <div>
                <span class="block-title">Preferred Study Period</span>
                <p class="block-hint">When do you usually sit down to focus? The scheduler starts your sessions here.</p>
              </div>
            </div>

            <div class="period-grid" role="radiogroup" aria-label="Preferred Study Period">
              <div
                class="period-card"
                [class.selected]="preferences.preferredPeriod === 'MORNING'"
                (click)="preferences.preferredPeriod = 'MORNING'"
                role="radio"
                [attr.aria-checked]="preferences.preferredPeriod === 'MORNING'"
                tabindex="0"
                (keydown.enter)="preferences.preferredPeriod = 'MORNING'"
                (keydown.space)="preferences.preferredPeriod = 'MORNING'"
              >
                <div class="period-icon" aria-hidden="true">🌅</div>
                <div class="period-name">Morning</div>
                <div class="period-time">09:00 AM</div>
              </div>

              <div
                class="period-card"
                [class.selected]="preferences.preferredPeriod === 'AFTERNOON'"
                (click)="preferences.preferredPeriod = 'AFTERNOON'"
                role="radio"
                [attr.aria-checked]="preferences.preferredPeriod === 'AFTERNOON'"
                tabindex="0"
                (keydown.enter)="preferences.preferredPeriod = 'AFTERNOON'"
                (keydown.space)="preferences.preferredPeriod = 'AFTERNOON'"
              >
                <div class="period-icon" aria-hidden="true">☀️</div>
                <div class="period-name">Afternoon</div>
                <div class="period-time">02:00 PM</div>
              </div>

              <div
                class="period-card"
                [class.selected]="preferences.preferredPeriod === 'EVENING'"
                (click)="preferences.preferredPeriod = 'EVENING'"
                role="radio"
                [attr.aria-checked]="preferences.preferredPeriod === 'EVENING'"
                tabindex="0"
                (keydown.enter)="preferences.preferredPeriod = 'EVENING'"
                (keydown.space)="preferences.preferredPeriod = 'EVENING'"
              >
                <div class="period-icon" aria-hidden="true">🌆</div>
                <div class="period-name">Evening</div>
                <div class="period-time">05:30 PM</div>
              </div>

              <div
                class="period-card"
                [class.selected]="preferences.preferredPeriod === 'NIGHT'"
                (click)="preferences.preferredPeriod = 'NIGHT'"
                role="radio"
                [attr.aria-checked]="preferences.preferredPeriod === 'NIGHT'"
                tabindex="0"
                (keydown.enter)="preferences.preferredPeriod = 'NIGHT'"
                (keydown.space)="preferences.preferredPeriod = 'NIGHT'"
              >
                <div class="period-icon" aria-hidden="true">🌙</div>
                <div class="period-name">Night</div>
                <div class="period-time">08:00 PM</div>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Section 3: Energy Peak Alignment -->
          <div class="section-block">
            <div class="section-title-row">
              <div class="num-badge">3</div>
              <div>
                <span class="block-title">Mental Energy Peak</span>
                <p class="block-hint">PrepPilot prioritizes your hardest chapters when your brain is sharpest.</p>
              </div>
            </div>

            <div class="energy-grid" role="radiogroup" aria-label="Mental Energy Peak">
              <div
                class="energy-card"
                [class.selected]="preferences.energyPeakTime === 'EARLY_DAY'"
                (click)="preferences.energyPeakTime = 'EARLY_DAY'"
                role="radio"
                [attr.aria-checked]="preferences.energyPeakTime === 'EARLY_DAY'"
                tabindex="0"
                (keydown.enter)="preferences.energyPeakTime = 'EARLY_DAY'"
                (keydown.space)="preferences.energyPeakTime = 'EARLY_DAY'"
              >
                <span class="energy-icon">⚡</span>
                <div>
                  <div class="energy-name">Early Day Flow</div>
                  <div class="energy-desc">Tackle difficult topics in your first daily sessions</div>
                </div>
              </div>

              <div
                class="energy-card"
                [class.selected]="preferences.energyPeakTime === 'LATE_DAY'"
                (click)="preferences.energyPeakTime = 'LATE_DAY'"
                role="radio"
                [attr.aria-checked]="preferences.energyPeakTime === 'LATE_DAY'"
                tabindex="0"
                (keydown.enter)="preferences.energyPeakTime = 'LATE_DAY'"
                (keydown.space)="preferences.energyPeakTime = 'LATE_DAY'"
              >
                <span class="energy-icon">🌙</span>
                <div>
                  <div class="energy-name">Late Day Flow</div>
                  <div class="energy-desc">Warm up first, schedule deep dives in later sessions</div>
                </div>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Section 4: Pomodoro Cadence -->
          <div class="section-block">
            <div class="section-title-row">
              <div class="num-badge">4</div>
              <div>
                <span class="block-title">Pomodoro Interval Cadence</span>
                <p class="block-hint">Structured study blocks prevent cognitive fatigue.</p>
              </div>
            </div>

            <div class="cadence-grid">
              <div class="form-group">
                <label for="sessDuration">Focus block length</label>
                <select id="sessDuration" name="sessionDuration" [(ngModel)]="preferences.sessionDurationMinutes">
                  <option [value]="30">30 minutes (Quick)</option>
                  <option [value]="45">45 minutes (Standard)</option>
                  <option [value]="50">50 minutes (Classic Pomodoro)</option>
                  <option [value]="60">60 minutes (Deep Focus)</option>
                </select>
              </div>

              <div class="form-group">
                <label for="brkDuration">Rest break length</label>
                <select id="brkDuration" name="breakDuration" [(ngModel)]="preferences.breakDurationMinutes">
                  <option [value]="5">5 minutes</option>
                  <option [value]="10">10 minutes (Recommended)</option>
                  <option [value]="15">15 minutes (Relaxed)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Action Footer -->
          <div class="action-footer">
            <button type="submit" class="btn-primary btn-continue" [disabled]="saving">
              @if (saving) {
                <span class="spinner-dot"></span>
                <span>Saving Preferences...</span>
              } @else {
                <span>Continue to Syllabus Setup →</span>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .onboarding-container {
      max-width: 720px;
    }
    .header-section {
      margin-bottom: 1.75rem;
      text-align: center;
    }
    .step-chip {
      display: inline-block;
      background: var(--primary-light);
      color: var(--primary);
      border: 1px solid var(--primary-border);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.65rem;
      border-radius: var(--radius-full);
      margin-bottom: 0.5rem;
    }
    .header-section h2 {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.3px;
    }
    .subtitle {
      color: var(--text-muted);
      margin-top: 0.35rem;
      font-size: 0.92rem;
      max-width: 540px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.4;
    }
    .onboarding-card {
      padding: 2rem;
    }
    @media (max-width: 600px) {
      .onboarding-card {
        padding: 1.25rem;
      }
    }
    .section-block {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .section-title-row {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .num-badge {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--primary-light);
      color: var(--primary);
      font-weight: 700;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 0.15rem;
    }
    .pref-label-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .block-title {
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--text-main);
    }
    .capacity-badge {
      background: var(--primary-light);
      color: var(--primary);
      border: 1px solid var(--primary-border);
      padding: 0.15rem 0.55rem;
      border-radius: var(--radius-full);
      font-size: 0.8rem;
      font-weight: 700;
    }
    .block-hint {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-top: 0.2rem;
      line-height: 1.35;
    }
    .divider {
      height: 1px;
      background-color: var(--border);
      margin: 1.75rem 0;
    }
    .slider-wrapper {
      margin-top: 0.5rem;
    }
    .range-slider {
      width: 100%;
      accent-color: var(--primary);
      cursor: pointer;
      height: 6px;
    }
    .slider-ticks {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.35rem;
    }
    .period-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      margin-top: 0.35rem;
    }
    @media (max-width: 600px) {
      .period-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .period-card {
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 0.85rem 0.5rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s ease;
      background: #ffffff;
    }
    .period-card:hover {
      border-color: #cbd5e1;
      background: var(--bg-subtle);
    }
    .period-card.selected {
      border-color: var(--primary);
      background: var(--primary-light);
      box-shadow: 0 0 0 1px var(--primary);
    }
    .period-icon {
      font-size: 1.35rem;
      margin-bottom: 0.2rem;
    }
    .period-name {
      font-weight: 600;
      font-size: 0.84rem;
      color: var(--text-main);
    }
    .period-time {
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-top: 0.15rem;
    }
    .energy-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-top: 0.35rem;
    }
    @media (max-width: 600px) {
      .energy-grid {
        grid-template-columns: 1fr;
      }
    }
    .energy-card {
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      transition: all 0.15s ease;
      background: #ffffff;
    }
    .energy-card:hover {
      border-color: #cbd5e1;
      background: var(--bg-subtle);
    }
    .energy-card.selected {
      border-color: var(--primary);
      background: var(--primary-light);
      box-shadow: 0 0 0 1px var(--primary);
    }
    .energy-icon {
      font-size: 1.35rem;
    }
    .energy-name {
      font-weight: 600;
      font-size: 0.88rem;
      color: var(--text-main);
    }
    .energy-desc {
      font-size: 0.76rem;
      color: var(--text-muted);
      margin-top: 0.15rem;
    }
    .cadence-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 0.35rem;
    }
    @media (max-width: 600px) {
      .cadence-grid {
        grid-template-columns: 1fr;
      }
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
    select {
      width: 100%;
    }
    .action-footer {
      margin-top: 2rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
    }
    .btn-continue {
      font-size: 0.95rem;
      padding: 0.7rem 1.6rem;
      font-weight: 600;
    }
  `],
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
