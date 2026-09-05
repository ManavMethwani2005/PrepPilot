import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { PlanService } from '../../core/services/plan.service';
import { RescheduleResult, Session } from '../../core/models/session.model';

@Component({
  selector: 'app-timetable',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container timetable-container">
      <div class="timetable-header">
        <div>
          <h2>Adaptive Study Timetable</h2>
          <p>Your non-overlapping Pomodoro schedule dynamically adjusted to your pace.</p>
        </div>

        <div class="controls-row">
          <button class="btn-secondary" (click)="shiftWeek(-7)">← Prev</button>
          <button class="btn-secondary btn-today" (click)="resetToCurrentWeek()" [disabled]="weekOffset === 0">Today</button>
          <span class="current-week-label">
            {{ weekStart | date: 'mediumDate' }} — {{ weekEnd | date: 'mediumDate' }}
          </span>
          <button class="btn-secondary" (click)="shiftWeek(7)">Next →</button>
        </div>
      </div>

      <!-- Weekly Summary Bar -->
      @if (!loading && sessions.length > 0) {
        <div class="week-summary-bar">
          <span class="summary-pill">📅 <strong>{{ totalWeekSessions }}</strong> Sessions this week</span>
          <span class="summary-pill">✅ <strong>{{ completedWeekSessions }}</strong> Completed</span>
          <span class="summary-pill">⏳ <strong>{{ totalWeekHours }}h</strong> Planned Focus</span>
          <span class="summary-pill ai-pill">🛡️ Adaptive Co-Pilot Active</span>
        </div>
      }

      <!-- Rescheduling Notification / Result Banner -->
      @if (rescheduleResult) {
        <div class="reschedule-banner card">
          <div class="reschedule-header">
            <div class="reschedule-title-row">
              <span class="reschedule-chip">⚡ Schedule Adapted Intelligently</span>
              <span class="strategy-badge">{{ formatStrategy(rescheduleResult.strategy) }}</span>
            </div>
            <button class="btn-close-banner" (click)="rescheduleResult = null" title="Dismiss">✕</button>
          </div>
          <p class="reschedule-expl">{{ rescheduleResult.explanation }}</p>
          <p class="reschedule-reassurance">No domino delays. PrepPilot dynamically balances your upcoming revision sessions.</p>
        </div>
      }

      @if (loading) {
        <div class="loading-state">
          <div class="skeleton-line" style="width: 60%; height: 28px; margin: 0 auto 12px;"></div>
          <div class="skeleton-line" style="width: 40%; height: 16px; margin: 0 auto;"></div>
        </div>
      } @else if (sessions.length === 0) {
        <div class="card empty-state">
          <div class="empty-icon">📅</div>
          <h3>No study sessions scheduled for this week</h3>
          <p>You haven't generated a study schedule yet or have no topics assigned for this date window.</p>
          <a routerLink="/subjects" class="btn-primary">Set Up Syllabus & Generate Plan →</a>
        </div>
      } @else {
        <!-- Day-by-day timetable columns -->
        <div class="days-column-container">
          @for (day of groupedDays; track day.dateStr) {
            <div class="day-card card" [class.is-today]="isToday(day.dateStr)">
              <div class="day-header">
                <div class="day-title-wrap">
                  <span class="day-name">{{ day.date | date: 'EEEE' }}</span>
                  <span class="day-date">{{ day.date | date: 'MMM d' }}</span>
                </div>
                <div class="day-badge-wrap">
                  @if (isToday(day.dateStr)) {
                    <span class="today-tag">TODAY</span>
                  }
                  @if (day.sessions.length > 0) {
                    <span class="day-time-tag">{{ getDayTotalMinutes(day.sessions) }}m</span>
                  }
                </div>
              </div>

              <div class="day-sessions">
                @if (day.sessions.length === 0) {
                  <div class="empty-day-box">
                    <span>🌴 Free time / Rest day</span>
                  </div>
                } @else {
                  @for (session of day.sessions; track session._id) {
                    <div
                      class="session-box"
                      [class.buffer]="session.sessionType === 'BUFFER'"
                      [class.completed]="session.status === 'COMPLETED'"
                      [class.missed]="session.status === 'MISSED'"
                      [style.border-left-color]="session.subjectId?.color || '#94a3b8'"
                    >
                      <div class="session-top">
                        <span class="session-time">{{ session.startTime }} - {{ session.endTime }}</span>
                        <div class="top-tags">
                          <span class="type-badge" [class]="'type-' + session.sessionType.toLowerCase()">
                            {{ session.sessionType }}
                          </span>
                          <span class="dur-badge">{{ session.durationMinutes }}m</span>
                        </div>
                      </div>

                      <div class="session-title">
                        {{ session.topicId?.title || (session.sessionType === 'BUFFER' ? 'Buffer / Catch-up Slot' : 'Revision Session') }}
                      </div>

                      @if (session.subjectId) {
                        <div class="session-sub">
                          <span class="color-dot" [style.background]="session.subjectId.color"></span>
                          <span [style.color]="session.subjectId.color">{{ session.subjectId.name }}</span>
                        </div>
                      }

                      <!-- Action buttons based on status -->
                      <div class="session-actions">
                        @if (session.status === 'SCHEDULED') {
                          <button class="act-btn btn-done" (click)="markSession(session, 'COMPLETED')" title="Mark as Completed">✓ Done</button>
                          <button class="act-btn btn-partial" (click)="openPartialModal(session)" title="Log Partial Time">½ Partial</button>
                          <button class="act-btn btn-miss" (click)="triggerMissedAdaptive(session)" title="Missed - Auto Reschedule">✕ Missed</button>
                          <a [routerLink]="['/session', session._id]" class="act-btn btn-focus" title="Start Focus Timer">⏱️ Focus</a>
                        } @else if (session.status === 'COMPLETED') {
                          <span class="status-badge-done">✓ Completed ({{ session.durationMinutes }}m)</span>
                          <button class="btn-reset" (click)="markSession(session, 'SCHEDULED')" title="Undo completion">Reset</button>
                        } @else if (session.status === 'PARTIALLY_COMPLETED') {
                          <span class="status-badge-partial">½ Partial ({{ session.actualMinutesSpent || 0 }}m)</span>
                          <button class="btn-reset" (click)="markSession(session, 'SCHEDULED')">Reset</button>
                        } @else {
                          <span class="status-badge-missed">✕ Missed & Rescheduled</span>
                          <button class="btn-reset" (click)="markSession(session, 'SCHEDULED')">Reset</button>
                        }
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Partial Completion Modal -->
      @if (showPartialModal && activeSessionForPartial) {
        <div class="modal-backdrop" (click)="showPartialModal = false">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Log Partial Study Session</h3>
              <button class="btn-close-modal" (click)="showPartialModal = false">✕</button>
            </div>
            <p class="modal-desc">
              Life happens! Enter how many minutes you studied for <strong>{{ activeSessionForPartial.topicId?.title || 'this session' }}</strong>. PrepPilot will credit your progress and intelligently absorb the remainder without domino delays.
            </p>

            <div class="preset-pills">
              <span class="preset-label">Quick select:</span>
              <button
                type="button"
                class="pill-btn"
                [class.active]="partialMinutes === 15"
                (click)="setPresetPartialMinutes(15)"
                *ngIf="activeSessionForPartial.durationMinutes > 15"
              >
                15m
              </button>
              <button
                type="button"
                class="pill-btn"
                [class.active]="partialMinutes === 25"
                (click)="setPresetPartialMinutes(25)"
                *ngIf="activeSessionForPartial.durationMinutes > 25"
              >
                25m
              </button>
              <button
                type="button"
                class="pill-btn"
                [class.active]="partialMinutes === 35"
                (click)="setPresetPartialMinutes(35)"
                *ngIf="activeSessionForPartial.durationMinutes > 35"
              >
                35m
              </button>
            </div>

            <div class="form-group">
              <label>Minutes Completed (out of {{ activeSessionForPartial.durationMinutes }}m):</label>
              <input type="number" [(ngModel)]="partialMinutes" min="5" [max]="activeSessionForPartial.durationMinutes - 1" />
            </div>

            <div class="modal-actions">
              <button class="btn-secondary" (click)="showPartialModal = false">Cancel</button>
              <button class="btn-primary" (click)="submitPartialCompletion()">⚡ Adapt Remaining Schedule</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .timetable-container {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .timetable-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .timetable-header h2 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }
    .timetable-header p {
      color: var(--text-muted);
      font-size: 0.95rem;
      margin-top: 0.15rem;
    }
    .controls-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .btn-today {
      padding: 0.5rem 0.85rem;
      font-weight: 600;
      font-size: 0.85rem;
    }
    .current-week-label {
      font-weight: 600;
      font-size: 0.9rem;
      background: #ffffff;
      padding: 0.5rem 0.85rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      color: var(--text-main);
      white-space: nowrap;
    }

    /* Week Summary Bar */
    .week-summary-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .summary-pill {
      background: #ffffff;
      border: 1px solid var(--border);
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .summary-pill strong {
      color: var(--text-main);
    }
    .ai-pill {
      background: #f5f3ff;
      border-color: #ddd6fe;
      color: var(--purple);
      font-weight: 600;
    }

    /* Reschedule Notification Banner */
    .reschedule-banner {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 5px solid var(--warning);
      padding: 1.25rem 1.5rem;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.08);
      position: relative;
    }
    .reschedule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .reschedule-title-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .reschedule-chip {
      background: var(--warning);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 0.2rem 0.65rem;
      border-radius: var(--radius-full);
      letter-spacing: 0.3px;
    }
    .strategy-badge {
      background: #ffffff;
      border: 1px solid #fde68a;
      color: #92400e;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.55rem;
      border-radius: var(--radius-full);
    }
    .btn-close-banner {
      background: transparent;
      border: none;
      font-size: 1.1rem;
      cursor: pointer;
      color: var(--text-muted);
      padding: 0.2rem 0.5rem;
      line-height: 1;
    }
    .btn-close-banner:hover {
      color: var(--text-main);
    }
    .reschedule-expl {
      font-size: 0.95rem;
      color: var(--text-main);
      line-height: 1.5;
      margin-bottom: 0.35rem;
    }
    .reschedule-reassurance {
      font-size: 0.8rem;
      color: #92400e;
      font-weight: 500;
    }

    /* Days Column Layout */
    .days-column-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
      gap: 1.25rem;
      align-items: start;
    }
    .day-card {
      padding: 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      background: #ffffff;
      transition: box-shadow 0.2s ease;
    }
    .day-card.is-today {
      border: 2px solid var(--primary);
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.1);
    }
    .day-header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.65rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .day-title-wrap {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }
    .day-name {
      font-weight: 700;
      font-size: 1rem;
      color: var(--text-main);
    }
    .day-date {
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .day-badge-wrap {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .today-tag {
      background: var(--primary);
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
      letter-spacing: 0.5px;
    }
    .day-time-tag {
      font-size: 0.75rem;
      color: var(--text-muted);
      background: #f1f5f9;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
    }
    .empty-day-box {
      padding: 2rem 1rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
      background: #f8fafc;
      border-radius: var(--radius-md);
      border: 1px dashed var(--border);
    }
    .day-sessions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* Session Box */
    .session-box {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-left: 4px solid #94a3b8;
      border-radius: var(--radius-md);
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      transition: all 0.2s ease;
    }
    .session-box:hover {
      box-shadow: var(--shadow-sm);
      background: #ffffff;
    }
    .session-box.buffer {
      border-style: dashed;
      background: #faf5ff;
      border-left-color: var(--purple) !important;
    }
    .session-box.completed {
      background: #f8fafc;
      opacity: 0.72;
    }
    .session-box.missed {
      background: #fff5f5;
    }
    .session-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .session-time {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .top-tags {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .type-badge {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-sm);
    }
    .type-learning { background: var(--primary-light); color: var(--primary-text); }
    .type-revision { background: var(--warning-light); color: var(--warning-text); }
    .type-practice { background: var(--secondary-light); color: var(--secondary); }
    .type-buffer { background: var(--purple-light); color: var(--purple); }
    .dur-badge {
      font-size: 0.68rem;
      color: var(--text-muted);
      background: #ffffff;
      padding: 0.1rem 0.35rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }
    .session-title {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-main);
      line-height: 1.35;
    }
    .session-sub {
      font-size: 0.78rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .color-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    /* Actions */
    .session-actions {
      display: flex;
      gap: 0.35rem;
      align-items: center;
      margin-top: 0.4rem;
      flex-wrap: wrap;
    }
    .act-btn {
      padding: 0.3rem 0.55rem;
      font-size: 0.72rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-done {
      background: var(--success-light);
      color: var(--success-text);
      border-color: #bbf7d0;
    }
    .btn-done:hover { background: #bbf7d0; }
    .btn-partial {
      background: var(--warning-light);
      color: var(--warning-text);
      border-color: #fde68a;
    }
    .btn-partial:hover { background: #fde68a; }
    .btn-miss {
      background: var(--danger-light);
      color: var(--danger-text);
      border-color: #fecaca;
    }
    .btn-miss:hover { background: #fecaca; }
    .btn-focus {
      background: #ffffff;
      color: var(--primary);
      border-color: #c7d2fe;
    }
    .btn-focus:hover {
      background: var(--primary);
      color: #ffffff;
    }
    .status-badge-done {
      color: var(--success);
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--success-light);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .status-badge-partial {
      color: var(--warning-text);
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--warning-light);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .status-badge-missed {
      color: var(--danger-text);
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--danger-light);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .btn-reset {
      background: transparent;
      color: var(--text-muted);
      font-size: 0.7rem;
      padding: 0.2rem 0.45rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .btn-reset:hover {
      background: #f1f5f9;
      color: var(--text-main);
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1rem;
    }
    .modal-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      padding: 1.75rem 2rem;
      width: 100%;
      max-width: 460px;
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .btn-close-modal {
      background: transparent;
      border: none;
      font-size: 1.1rem;
      cursor: pointer;
      color: var(--text-muted);
    }
    .modal-desc {
      font-size: 0.9rem;
      color: var(--text-muted);
      line-height: 1.45;
    }
    .preset-pills {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .preset-label {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .pill-btn {
      background: #f1f5f9;
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-full);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .pill-btn.active {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-main);
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    @media (max-width: 768px) {
      .days-column-container {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class TimetableComponent implements OnInit {
  sessions: Session[] = [];
  loading = true;
  weekOffset = 0;
  weekStart = new Date();
  weekEnd = new Date();

  groupedDays: { date: Date; dateStr: string; sessions: Session[] }[] = [];
  rescheduleResult: RescheduleResult | null = null;

  showPartialModal = false;
  activeSessionForPartial: Session | null = null;
  partialMinutes = 20;

  private sessionService = inject(SessionService);

  get totalWeekSessions(): number {
    return this.sessions.length;
  }

  get completedWeekSessions(): number {
    return this.sessions.filter((s) => s.status === 'COMPLETED').length;
  }

  get totalWeekHours(): string {
    const mins = this.sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    return (mins / 60).toFixed(1);
  }

  ngOnInit(): void {
    this.calculateWeekRange();
    this.loadSessions();
  }

  calculateWeekRange(): void {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 is Sunday
    const distanceToMonday = (currentDayOfWeek + 6) % 7;

    const start = new Date(today);
    start.setDate(today.getDate() - distanceToMonday + this.weekOffset);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    this.weekStart = start;
    this.weekEnd = end;
  }

  shiftWeek(days: number): void {
    this.weekOffset += days;
    this.calculateWeekRange();
    this.loadSessions();
  }

  resetToCurrentWeek(): void {
    this.weekOffset = 0;
    this.calculateWeekRange();
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading = true;
    const startStr = this.weekStart.toISOString();
    const endStr = this.weekEnd.toISOString();

    this.sessionService.getSessions(startStr, endStr).subscribe({
      next: (res) => {
        this.sessions = res.data;
        this.groupSessionsByDay();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  groupSessionsByDay(): void {
    const groups: { [key: string]: { date: Date; dateStr: string; sessions: Session[] } } = {};

    // Initialize all 7 days of the week so empty days are shown cleanly
    for (let i = 0; i < 7; i++) {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      groups[dateStr] = { date: d, dateStr, sessions: [] };
    }

    this.sessions.forEach((s) => {
      const dateStr = new Date(s.date).toISOString().split('T')[0];
      if (groups[dateStr]) {
        groups[dateStr].sessions.push(s);
      }
    });

    this.groupedDays = Object.values(groups);
  }

  isToday(dateStr: string): boolean {
    return dateStr === new Date().toISOString().split('T')[0];
  }

  getDayTotalMinutes(daySessions: Session[]): number {
    return daySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  }

  formatStrategy(strategy: string): string {
    switch (strategy) {
      case 'BUFFER_ABSORPTION':
        return 'Buffer Slot Absorption (No extra workload added)';
      case 'PRIORITY_REBALANCE':
        return 'Urgency Rebalance (Swapped lower priority review slot)';
      case 'NEXT_AVAILABLE_ALLOCATION':
        return 'Next Available Slot Allocation';
      case 'IMMINENT_EXAM_STRATEGY':
        return 'Exam Imminent (Targeted Recall Strategy)';
      default:
        return strategy || 'Adaptive Reallocation';
    }
  }

  markSession(session: Session, status: 'SCHEDULED' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'MISSED'): void {
    this.sessionService.updateStatus(session._id, status).subscribe({
      next: () => this.loadSessions(),
    });
  }

  triggerMissedAdaptive(session: Session): void {
    this.sessionService.triggerReschedule(session._id, 0).subscribe({
      next: (res) => {
        this.rescheduleResult = res.data;
        this.loadSessions();
      },
    });
  }

  openPartialModal(session: Session): void {
    this.activeSessionForPartial = session;
    this.partialMinutes = Math.floor(session.durationMinutes / 2);
    this.showPartialModal = true;
  }

  setPresetPartialMinutes(mins: number): void {
    if (!this.activeSessionForPartial) return;
    if (mins < this.activeSessionForPartial.durationMinutes) {
      this.partialMinutes = mins;
    }
  }

  submitPartialCompletion(): void {
    if (!this.activeSessionForPartial) return;
    this.sessionService.triggerReschedule(this.activeSessionForPartial._id, this.partialMinutes).subscribe({
      next: (res) => {
        this.showPartialModal = false;
        this.rescheduleResult = res.data;
        this.loadSessions();
      },
    });
  }
}
