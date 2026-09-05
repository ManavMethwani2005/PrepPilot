import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { Session } from '../../core/models/session.model';

@Component({
  selector: 'app-active-session',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container focus-container">
      @if (loading) {
        <div class="card loading-card">
          <div class="skeleton-line" style="width: 50%; height: 28px; margin: 0 auto 12px;"></div>
          <div class="skeleton-line" style="width: 30%; height: 16px; margin: 0 auto;"></div>
        </div>
      } @else if (!session) {
        <div class="card empty-state">
          <h3>Session not found</h3>
          <p>This focus session may have been deleted or already re-allocated.</p>
          <a routerLink="/timetable" class="btn-primary">Return to Timetable</a>
        </div>
      } @else {
        <div class="focus-card card">
          <!-- Session Header Meta -->
          <div class="session-meta">
            <span class="type-pill" [class]="'type-' + session.sessionType.toLowerCase()">
              {{ session.sessionType }} SESSION
            </span>
            @if (session.subjectId) {
              <span class="sub-badge" [style.color]="session.subjectId.color">
                <span class="color-dot" [style.background]="session.subjectId.color"></span>
                {{ session.subjectId.name }}
              </span>
            }
            <span class="duration-pill">⏱️ {{ session.durationMinutes }}m planned</span>
          </div>

          <h2 class="topic-heading">{{ session.topicId?.title || 'Open Review Session' }}</h2>

          <!-- PrepPilot Topic Study Tip Box -->
          @if (topicTip) {
            <div class="topic-tip-card">
              <span class="sparkle">✨</span>
              <div class="tip-content">
                <span class="tip-tag">PrepPilot AI Study Technique</span>
                <p class="tip-body">{{ topicTip }}</p>
              </div>
            </div>
          } @else if (session.topicId) {
            <div class="tip-cta-card">
              <div class="tip-default-text">
                💡 <strong>Active Focus:</strong> Silence distractions and test yourself after each concept.
              </div>
              <button class="btn-get-tip" (click)="fetchTopicTip()" [disabled]="loadingTip">
                @if (loadingTip) {
                  <span>Consulting PrepPilot AI...</span>
                } @else {
                  <span>✨ Get AI Strategy for this Topic</span>
                }
              </button>
            </div>
          }

          <!-- Pomodoro Countdown Timer Display -->
          <div class="timer-display">
            <div class="timer-status-badge" [class.active]="isRunning" [class.done]="timeRemaining === 0">
              {{ isRunning ? '⚡ FOCUS IN PROGRESS' : (timeRemaining === 0 ? '🎉 SESSION FINISHED!' : '⏸ TIMER PAUSED') }}
            </div>
            <div class="time-number">{{ formattedTime }}</div>

            <!-- Progress Bar -->
            <div class="timer-progress-bg">
              <div class="timer-progress-fill" [style.width.%]="progressPercent"></div>
            </div>
            <div class="progress-labels">
              <span>{{ elapsedMinutes }}m elapsed</span>
              <span>{{ progressPercent }}% completed</span>
            </div>
          </div>

          <!-- Timer Controls -->
          <div class="timer-controls">
            @if (!isRunning) {
              <button class="btn-primary btn-timer" (click)="startTimer()">▶ Start Focus</button>
            } @else {
              <button class="btn-secondary btn-timer btn-pause" (click)="pauseTimer()">⏸ Pause</button>
            }
            <button class="btn-secondary btn-reset" (click)="resetTimer()">↺ Reset</button>
          </div>

          <!-- Session Outcome Actions -->
          <div class="outcome-actions">
            <div class="outcome-header">
              <span>When you're done studying:</span>
            </div>
            <div class="outcome-buttons">
              <button class="btn-success btn-finish" (click)="completeSession()">
                ✓ Complete & Log {{ session.durationMinutes }}m
              </button>
              <button class="btn-danger btn-miss" (click)="markMissedAndReschedule()">
                ✕ Mark Missed & Auto-Reschedule
              </button>
            </div>
            <a routerLink="/timetable" class="link-back">← Back to Timetable</a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .focus-container {
      max-width: 680px;
      margin: 2rem auto;
    }
    .loading-card {
      padding: 3rem;
      text-align: center;
    }
    .focus-card {
      text-align: center;
      padding: 2.5rem 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
      box-shadow: var(--shadow-md);
      background: #ffffff;
    }
    .session-meta {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .type-pill {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.65rem;
      border-radius: var(--radius-full);
      letter-spacing: 0.4px;
    }
    .type-learning { background: var(--primary-light); color: var(--primary-text); }
    .type-revision { background: var(--warning-light); color: var(--warning-text); }
    .type-practice { background: var(--secondary-light); color: var(--secondary); }
    .type-buffer { background: var(--purple-light); color: var(--purple); }
    .sub-badge {
      font-weight: 600;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .color-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .duration-pill {
      font-size: 0.75rem;
      color: var(--text-muted);
      background: #f1f5f9;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-full);
    }
    .topic-heading {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--text-main);
      max-width: 540px;
      line-height: 1.25;
      letter-spacing: -0.02em;
    }

    /* Tip box */
    .topic-tip-card {
      background: #fcfaff;
      border: 1px solid #e9d5ff;
      border-left: 4px solid var(--purple);
      border-radius: var(--radius-md);
      padding: 1rem 1.25rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      max-width: 540px;
      text-align: left;
    }
    .sparkle {
      font-size: 1.3rem;
      line-height: 1;
    }
    .tip-content {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .tip-tag {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--purple);
    }
    .tip-body {
      font-size: 0.9rem;
      color: var(--text-main);
      line-height: 1.45;
    }
    .tip-cta-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
      background: #f8fafc;
      padding: 0.85rem 1.25rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      max-width: 520px;
      width: 100%;
    }
    .tip-default-text {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .btn-get-tip {
      background: #ffffff;
      color: var(--purple);
      border: 1px solid #ddd6fe;
      padding: 0.4rem 0.9rem;
      border-radius: var(--radius-full);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-get-tip:hover:not(:disabled) {
      background: var(--purple-light);
      border-color: var(--purple);
    }

    /* Timer Display */
    .timer-display {
      margin: 0.5rem 0;
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .timer-status-badge {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 1px;
      color: var(--text-muted);
      background: #f1f5f9;
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-full);
      margin-bottom: 0.5rem;
    }
    .timer-status-badge.active {
      background: var(--primary-light);
      color: var(--primary-text);
      animation: pulse 2s infinite;
    }
    .timer-status-badge.done {
      background: var(--success-light);
      color: var(--success-text);
    }
    .time-number {
      font-size: 5rem;
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--text-main);
      letter-spacing: 2px;
      line-height: 1;
      margin: 0.5rem 0;
    }
    .timer-progress-bg {
      width: 100%;
      height: 8px;
      background: #e2e8f0;
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-top: 0.75rem;
    }
    .timer-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), #818cf8);
      border-radius: var(--radius-full);
      transition: width 0.5s ease;
    }
    .progress-labels {
      width: 100%;
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.35rem;
    }

    /* Timer Controls */
    .timer-controls {
      display: flex;
      gap: 0.85rem;
      align-items: center;
    }
    .btn-timer {
      padding: 0.75rem 2.25rem;
      font-size: 1.05rem;
      font-weight: 700;
      border-radius: var(--radius-full);
    }
    .btn-pause {
      background: #f1f5f9;
      color: var(--text-main);
      border-color: var(--border);
    }
    .btn-pause:hover {
      background: #e2e8f0;
    }
    .btn-reset {
      border-radius: var(--radius-full);
      padding: 0.75rem 1.25rem;
      font-size: 0.95rem;
    }

    /* Outcome actions */
    .outcome-actions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.85rem;
      margin-top: 1rem;
      border-top: 1px solid var(--border);
      padding-top: 1.5rem;
      width: 100%;
    }
    .outcome-header {
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .outcome-buttons {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
      width: 100%;
    }
    .btn-finish {
      padding: 0.7rem 1.5rem;
      font-weight: 700;
      font-size: 0.9rem;
    }
    .btn-miss {
      padding: 0.7rem 1.25rem;
      font-weight: 600;
      font-size: 0.88rem;
    }
    .link-back {
      font-size: 0.85rem;
      color: var(--text-muted);
      text-decoration: none;
      margin-top: 0.25rem;
    }
    .link-back:hover {
      color: var(--text-main);
      text-decoration: underline;
    }

    @media (max-width: 480px) {
      .time-number {
        font-size: 3.75rem;
      }
      .topic-heading {
        font-size: 1.4rem;
      }
      .outcome-buttons {
        flex-direction: column;
      }
    }
  `],
})
export class ActiveSessionComponent implements OnInit, OnDestroy {
  session: Session | null = null;
  loading = true;

  timeRemaining = 50 * 60; // in seconds
  isRunning = false;
  timerInterval: any = null;

  topicTip = '';
  loadingTip = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionService = inject(SessionService);

  get totalDurationSeconds(): number {
    return (this.session?.durationMinutes || 50) * 60;
  }

  get elapsedMinutes(): number {
    const elapsedSecs = this.totalDurationSeconds - this.timeRemaining;
    return Math.floor(elapsedSecs / 60);
  }

  get progressPercent(): number {
    if (!this.totalDurationSeconds) return 0;
    const elapsed = this.totalDurationSeconds - this.timeRemaining;
    return Math.min(100, Math.max(0, Math.round((elapsed / this.totalDurationSeconds) * 100)));
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSession(id);
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  loadSession(id: string): void {
    this.sessionService.getSessionById(id).subscribe({
      next: (res) => {
        if (res.data) {
          this.session = res.data;
          this.timeRemaining = (res.data.durationMinutes || 50) * 60;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get formattedTime(): string {
    const mins = Math.floor(this.timeRemaining / 60);
    const secs = this.timeRemaining % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  startTimer(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timerInterval = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
      } else {
        this.pauseTimer();
      }
    }, 1000);
  }

  pauseTimer(): void {
    this.isRunning = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  resetTimer(): void {
    this.pauseTimer();
    if (this.session) {
      this.timeRemaining = this.session.durationMinutes * 60;
    }
  }

  fetchTopicTip(): void {
    if (!this.session?.topicId?._id) return;
    this.loadingTip = true;
    this.sessionService.getTopicTip(this.session.topicId._id).subscribe({
      next: (res) => {
        this.topicTip = res.tip;
        this.loadingTip = false;
      },
      error: () => {
        this.loadingTip = false;
      },
    });
  }

  completeSession(): void {
    if (!this.session) return;
    this.sessionService.updateStatus(this.session._id, 'COMPLETED', this.session.durationMinutes).subscribe({
      next: () => {
        this.router.navigate(['/timetable']);
      },
    });
  }

  markMissedAndReschedule(): void {
    if (!this.session) return;
    this.sessionService.triggerReschedule(this.session._id, 0).subscribe({
      next: () => {
        this.router.navigate(['/timetable']);
      },
    });
  }
}
