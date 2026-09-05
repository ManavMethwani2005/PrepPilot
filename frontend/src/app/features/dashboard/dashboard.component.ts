import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
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
  private cdr = inject(ChangeDetectorRef);

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
    this.cdr.markForCheck();
    let loadedCount = 0;
    const checkDone = () => {
      loadedCount++;
      if (loadedCount >= 3) {
        this.loading = false;
        this.cdr.detectChanges();
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
