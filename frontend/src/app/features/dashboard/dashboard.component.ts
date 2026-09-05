import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlanService } from '../../core/services/plan.service';
import { AuthService } from '../../core/services/auth.service';
import { SubjectService } from '../../core/services/subject.service';
import { PlanStats, StudyPlan } from '../../core/models/plan.model';
import { Subject } from '../../core/models/subject.model';
import { Session } from '../../core/models/session.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container dashboard-container">
      <!-- Dynamic Welcome Header -->
      <div class="welcome-banner">
        <div>
          <h2>{{ greeting }}, {{ authService.currentUser()?.fullName || 'Student' }} 👋</h2>
          <p class="subtitle">Here's your study momentum and personalized focus plan for today.</p>
        </div>
        <div class="banner-actions">
          <a routerLink="/subjects" class="btn-secondary">Manage Syllabus 📚</a>
          <a routerLink="/timetable" class="btn-primary">View Full Timetable 🗓️</a>
        </div>
      </div>

      <!-- Loading Skeleton -->
      @if (loading) {
        <div class="card skeleton-banner">
          <div class="skeleton-line" style="width: 40%; height: 24px; margin-bottom: 12px;"></div>
          <div class="skeleton-line" style="width: 80%; height: 16px;"></div>
        </div>
        <div class="stats-grid">
          <div class="card skeleton-stat" *ngFor="let i of [1,2,3,4]">
            <div class="skeleton-line" style="width: 50%; height: 16px;"></div>
            <div class="skeleton-line" style="width: 70%; height: 28px; margin-top: 8px;"></div>
          </div>
        </div>
      } @else {
        <!-- PrepPilot AI Strategic Co-Pilot Recommendation Card -->
        @if (activePlan?.strategicTip || activePlan?.geminiSummary) {
          <div class="card ai-card">
            <div class="ai-header">
              <div class="ai-title-wrap">
                <span class="ai-chip">⚡ PrepPilot AI Strategy</span>
                <span class="ai-badge-live">Active Co-Pilot</span>
              </div>
              <span class="ai-status">Plan #{{ activePlan?._id?.substring((activePlan?._id?.length || 5) - 5) }}</span>
            </div>
            @if (activePlan?.geminiSummary) {
              <p class="ai-summary">{{ activePlan?.geminiSummary }}</p>
            }
            @if (activePlan?.strategicTip) {
              <div class="ai-tip-box">
                <span class="tip-icon">💡</span>
                <div class="tip-content">
                  <span class="tip-heading">Strategic Recommendation</span>
                  <p class="tip-text">{{ activePlan?.strategicTip }}</p>
                </div>
              </div>
            }
          </div>
        }

        <!-- Key Metrics Stats Grid -->
        <div class="stats-grid">
          <div class="card stat-card">
            <div class="stat-icon icon-indigo">📈</div>
            <div class="stat-info">
              <span class="stat-label">Plan Completion</span>
              <div class="stat-val-row">
                <span class="stat-val">{{ stats?.completionRate || 0 }}%</span>
              </div>
              <div class="stat-bar-bg">
                <div class="stat-bar-fill" [style.width.%]="stats?.completionRate || 0"></div>
              </div>
            </div>
          </div>

          <div class="card stat-card">
            <div class="stat-icon icon-emerald">✅</div>
            <div class="stat-info">
              <span class="stat-label">Sessions Completed</span>
              <span class="stat-val">{{ stats?.completedSessions || 0 }} <span class="stat-sub">/ {{ stats?.totalSessions || 0 }}</span></span>
              <span class="stat-footnote">Across active syllabus</span>
            </div>
          </div>

          <div class="card stat-card">
            <div class="stat-icon icon-amber">⏳</div>
            <div class="stat-info">
              <span class="stat-label">Today's Focus</span>
              <span class="stat-val">{{ todayCompletedCount }} <span class="stat-sub">/ {{ stats?.todaySessions?.length || 0 }}</span></span>
              <span class="stat-footnote">{{ todayPlannedMinutes }} mins planned</span>
            </div>
          </div>

          <div class="card stat-card">
            <div class="stat-icon icon-rose">🎯</div>
            <div class="stat-info">
              <span class="stat-label">Upcoming Exams</span>
              <span class="stat-val">{{ upcomingExams.length }}</span>
              <span class="stat-footnote">
                {{ nearestExamText }}
              </span>
            </div>
          </div>
        </div>

        <!-- Upcoming Exam Countdown Cards (if any) -->
        @if (upcomingExams.length > 0) {
          <div class="exams-section">
            <div class="section-title-row">
              <h3>Upcoming Exam Deadlines</h3>
              <span class="section-subtext">Countdown to priority milestones</span>
            </div>
            <div class="exams-grid">
              @for (subj of upcomingExams; track subj._id) {
                <div class="card exam-card" [style.border-left-color]="subj.color || '#4f46e5'">
                  <div class="exam-card-main">
                    <div class="exam-title-row">
                      <h4 class="exam-subj-name">{{ subj.name }}</h4>
                      <span
                        class="countdown-badge"
                        [class.urgent]="getDaysUntil(subj.examDate) <= 7"
                        [class.warning]="getDaysUntil(subj.examDate) > 7 && getDaysUntil(subj.examDate) <= 14"
                      >
                        {{ formatDaysUntil(subj.examDate) }}
                      </span>
                    </div>
                    <div class="exam-meta-row">
                      <span class="exam-date-text">📅 {{ subj.examDate | date: 'mediumDate' }}</span>
                      <span class="exam-topics-count">{{ subj.topics?.length || 0 }} topics</span>
                      <span class="priority-pill">Priority {{ subj.priorityWeight }}/5</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Today's Study Agenda Section -->
        <div class="card today-section">
          <div class="section-header">
            <div>
              <h3>Today's Focus Agenda</h3>
              <p class="agenda-subtitle">Structured, non-overlapping intervals designed for your peak energy.</p>
            </div>
            <span class="today-date-pill">{{ today | date: 'fullDate' }}</span>
          </div>

          @if (!stats?.todaySessions || stats?.todaySessions?.length === 0) {
            <div class="no-sessions-today">
              <div class="empty-icon-box">🎉</div>
              <h4>You're all caught up for today!</h4>
              <p>No study sessions scheduled for today, or no active timetable generated yet.</p>
              <div class="empty-actions">
                <a routerLink="/subjects" class="btn-primary">Manage Syllabus & Generate Plan →</a>
                <a routerLink="/timetable" class="btn-secondary">View Full Timetable</a>
              </div>
            </div>
          } @else {
            <div class="agenda-list">
              @for (session of stats?.todaySessions; track session._id) {
                <div
                  class="agenda-item"
                  [class.is-next]="isNextSession(session)"
                  [class.done]="session.status === 'COMPLETED'"
                  [class.missed]="session.status === 'MISSED'"
                  [style.border-left-color]="session.subjectId?.color || '#94a3b8'"
                >
                  <div class="time-block">
                    <span class="time-start">{{ session.startTime }}</span>
                    <span class="time-sep">to</span>
                    <span class="time-end">{{ session.endTime }}</span>
                  </div>

                  <div class="agenda-details">
                    <div class="topic-header-row">
                      <span class="topic-name">
                        {{ session.topicId?.title || (session.sessionType === 'BUFFER' ? 'Buffer / Catch-up Slot' : 'Revision Session') }}
                      </span>
                      @if (isNextSession(session)) {
                        <span class="next-up-pill">Next Up ⚡</span>
                      }
                    </div>

                    <div class="sub-name">
                      @if (session.subjectId) {
                        <span class="color-dot" [style.background]="session.subjectId.color"></span>
                        <span class="subj-name-text">{{ session.subjectId.name }}</span>
                      }
                      <span class="session-type-badge" [class]="'type-' + session.sessionType.toLowerCase()">
                        {{ session.sessionType }}
                      </span>
                      <span class="duration-badge">{{ session.durationMinutes }}m</span>
                    </div>
                  </div>

                  <div class="agenda-status">
                    <span class="badge" [class]="'status-' + session.status.toLowerCase()">
                      {{ formatStatus(session.status) }}
                    </span>
                    @if (session.status === 'SCHEDULED' || session.status === 'PARTIALLY_COMPLETED') {
                      <a [routerLink]="['/session', session._id]" class="btn-start">
                        Start Focus ⏱️
                      </a>
                    } @else if (session.status === 'COMPLETED') {
                      <span class="completed-check" title="Session completed">✓ Done</span>
                    } @else {
                      <a routerLink="/timetable" class="btn-review">
                        Adaptive Review →
                      </a>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .welcome-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .welcome-banner h2 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
      margin-top: 0.2rem;
    }
    .banner-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    /* Skeleton Loading */
    .skeleton-banner, .skeleton-stat {
      padding: 1.5rem;
    }

    /* AI Strategy Card */
    .ai-card {
      background: linear-gradient(135deg, #fbfaff, #f5f3ff);
      border: 1px solid #ddd6fe;
      border-left: 5px solid var(--purple);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.08);
      padding: 1.25rem 1.5rem;
    }
    .ai-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .ai-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .ai-chip {
      background: var(--purple);
      color: #ffffff;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-full);
      letter-spacing: 0.4px;
    }
    .ai-badge-live {
      background: #ede9fe;
      color: var(--purple);
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-full);
    }
    .ai-status {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-family: monospace;
    }
    .ai-summary {
      font-size: 0.95rem;
      color: var(--text-main);
      line-height: 1.55;
      margin-bottom: 0.85rem;
    }
    .ai-tip-box {
      background: #ffffff;
      border-radius: var(--radius-md);
      padding: 0.85rem 1.1rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      border: 1px solid #e9d5ff;
    }
    .tip-icon {
      font-size: 1.3rem;
      line-height: 1;
    }
    .tip-content {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .tip-heading {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--purple);
    }
    .tip-text {
      font-size: 0.9rem;
      color: var(--text-main);
      line-height: 1.45;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      flex-shrink: 0;
    }
    .icon-indigo { background: var(--primary-light); }
    .icon-emerald { background: var(--success-light); }
    .icon-amber { background: var(--warning-light); }
    .icon-rose { background: var(--danger-light); }
    .stat-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .stat-label {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .stat-val-row {
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
    }
    .stat-val {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.2;
    }
    .stat-sub {
      font-size: 0.85rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .stat-footnote {
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-top: 0.2rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .stat-bar-bg {
      width: 100%;
      height: 6px;
      background: #e2e8f0;
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-top: 0.4rem;
    }
    .stat-bar-fill {
      height: 100%;
      background: var(--primary);
      border-radius: var(--radius-full);
      transition: width 0.4s ease;
    }

    /* Upcoming Exams Section */
    .exams-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .section-title-row {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
    }
    .section-title-row h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .section-subtext {
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .exams-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.85rem;
    }
    .exam-card {
      border-left: 4px solid var(--primary);
      padding: 0.9rem 1.1rem;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .exam-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }
    .exam-subj-name {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .countdown-badge {
      background: var(--primary-light);
      color: var(--primary-text);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-full);
      white-space: nowrap;
    }
    .countdown-badge.warning {
      background: var(--warning-light);
      color: var(--warning-text);
    }
    .countdown-badge.urgent {
      background: var(--danger-light);
      color: var(--danger-text);
      animation: pulse 2s infinite;
    }
    .exam-meta-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.78rem;
      color: var(--text-muted);
      flex-wrap: wrap;
    }
    .priority-pill {
      background: #f1f5f9;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 0.7rem;
    }

    /* Today's Section */
    .today-section {
      padding: 1.5rem;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.85rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .section-header h3 {
      font-size: 1.25rem;
      font-weight: 700;
    }
    .agenda-subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 0.15rem;
    }
    .today-date-pill {
      background: #f1f5f9;
      color: var(--text-main);
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--border);
    }

    /* Empty state */
    .no-sessions-today {
      text-align: center;
      padding: 2.5rem 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    .empty-icon-box {
      font-size: 2.5rem;
      margin-bottom: 0.25rem;
    }
    .no-sessions-today h4 {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .no-sessions-today p {
      color: var(--text-muted);
      font-size: 0.9rem;
      max-width: 440px;
    }
    .empty-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    /* Agenda List */
    .agenda-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .agenda-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.9rem 1.1rem;
      background: #ffffff;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      border-left: 4px solid #94a3b8;
      gap: 1rem;
      transition: all 0.2s ease;
    }
    .agenda-item:hover {
      box-shadow: var(--shadow-sm);
    }
    .agenda-item.is-next {
      background: #fcfaff;
      border-color: #ddd6fe;
      border-left-color: var(--primary) !important;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.08);
    }
    .agenda-item.done {
      background: #f8fafc;
      opacity: 0.7;
    }
    .agenda-item.missed {
      background: #fff5f5;
    }
    .time-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 70px;
      font-family: inherit;
    }
    .time-start {
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--text-main);
    }
    .time-sep {
      font-size: 0.7rem;
      color: var(--text-muted);
      line-height: 1;
      margin: 1px 0;
    }
    .time-end {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .agenda-details {
      flex: 1;
      min-width: 0;
    }
    .topic-header-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .topic-name {
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--text-main);
    }
    .next-up-pill {
      background: var(--primary);
      color: #ffffff;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-full);
      letter-spacing: 0.3px;
    }
    .sub-name {
      font-size: 0.8rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.25rem;
      flex-wrap: wrap;
    }
    .subj-name-text {
      font-weight: 600;
      color: var(--text-main);
    }
    .color-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .session-type-badge {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-sm);
    }
    .type-learning { background: var(--primary-light); color: var(--primary-text); }
    .type-revision { background: var(--warning-light); color: var(--warning-text); }
    .type-practice { background: var(--secondary-light); color: var(--secondary); }
    .type-buffer { background: var(--purple-light); color: var(--purple); }
    .duration-badge {
      font-size: 0.7rem;
      color: var(--text-muted);
      background: #f1f5f9;
      padding: 0.1rem 0.35rem;
      border-radius: var(--radius-sm);
    }
    .agenda-status {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }
    .btn-start {
      background: var(--primary);
      color: #ffffff;
      padding: 0.45rem 0.85rem;
      border-radius: var(--radius-md);
      font-size: 0.82rem;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.15s ease;
      white-space: nowrap;
    }
    .btn-start:hover {
      background: var(--primary-hover);
      text-decoration: none;
    }
    .btn-review {
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--border);
      padding: 0.4rem 0.7rem;
      border-radius: var(--radius-md);
      font-size: 0.8rem;
      font-weight: 500;
      text-decoration: none;
    }
    .btn-review:hover {
      background: #f1f5f9;
      color: var(--text-main);
      text-decoration: none;
    }
    .completed-check {
      color: var(--success);
      font-size: 0.85rem;
      font-weight: 600;
    }

    @media (max-width: 640px) {
      .agenda-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }
      .time-block {
        flex-direction: row;
        gap: 0.35rem;
        align-items: baseline;
      }
      .agenda-status {
        width: 100%;
        justify-content: space-between;
      }
      .btn-start {
        flex: 1;
        text-align: center;
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  today = new Date();
  activePlan: StudyPlan | null = null;
  stats: PlanStats | null = null;
  upcomingExams: Subject[] = [];
  loading = true;

  authService = inject(AuthService);
  private planService = inject(PlanService);
  private subjectService = inject(SubjectService);

  get greeting(): string {
    const hour = this.today.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  get todayCompletedCount(): number {
    if (!this.stats?.todaySessions) return 0;
    return this.stats.todaySessions.filter((s) => s.status === 'COMPLETED').length;
  }

  get todayPlannedMinutes(): number {
    if (!this.stats?.todaySessions) return 0;
    return this.stats.todaySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  }

  get nearestExamText(): string {
    if (this.upcomingExams.length === 0) return 'No upcoming exams';
    const nearest = this.upcomingExams[0];
    const days = this.getDaysUntil(nearest.examDate);
    return `${nearest.name}: ${days}d left`;
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    let loadedCount = 0;
    const checkDone = () => {
      loadedCount++;
      if (loadedCount >= 3) {
        this.loading = false;
      }
    };

    this.planService.getActivePlan().subscribe({
      next: (res) => {
        this.activePlan = res.data;
        checkDone();
      },
      error: () => checkDone(),
    });

    this.planService.getPlanStats().subscribe({
      next: (res) => {
        this.stats = res.data;
        checkDone();
      },
      error: () => checkDone(),
    });

    this.subjectService.getSubjects().subscribe({
      next: (res) => {
        if (res.data) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          this.upcomingExams = res.data
            .filter((s) => new Date(s.examDate) >= now)
            .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
            .slice(0, 4);
        }
        checkDone();
      },
      error: () => checkDone(),
    });
  }

  getDaysUntil(dateStr: string): number {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  formatDaysUntil(dateStr: string): string {
    const days = this.getDaysUntil(dateStr);
    if (days === 0) return 'Exam Today 🔥';
    if (days === 1) return 'Tomorrow 🔥';
    return `${days} days left`;
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'SCHEDULED': return 'Scheduled';
      case 'COMPLETED': return 'Completed';
      case 'PARTIALLY_COMPLETED': return 'Partial';
      case 'MISSED': return 'Missed';
      default: return status;
    }
  }

  isNextSession(session: Session): boolean {
    if (!this.stats?.todaySessions) return false;
    const scheduled = this.stats.todaySessions.filter(
      (s) => s.status === 'SCHEDULED' || s.status === 'PARTIALLY_COMPLETED'
    );
    return scheduled.length > 0 && scheduled[0]._id === session._id;
  }
}
