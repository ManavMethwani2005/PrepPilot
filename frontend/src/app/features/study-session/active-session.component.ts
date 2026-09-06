import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { Session } from '../../core/models/session.model';

@Component({
  selector: 'app-active-session',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './active-session.component.html',
  styleUrls: ['./active-session.component.css'],
})
export class ActiveSessionComponent implements OnInit, OnDestroy {
  session: Session | null = null;
  todaySessions: Session[] = [];
  nextUpcomingSession: Session | null = null;
  loading = true;
  allCaughtUp = false;
  notFound = false;

  timeRemaining = 50 * 60; // in seconds
  isRunning = false;
  timerFinished = false;
  timerInterval: any = null;

  topicTip = '';
  loadingTip = false;

  showPartialModal = false;
  partialMinutes = 25;
  isSubmitting = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionService = inject(SessionService);
  private cdr = inject(ChangeDetectorRef);

  get totalDurationSeconds(): number {
    return (this.session?.durationMinutes || 50) * 60;
  }

  get elapsedMinutes(): number {
    const elapsedSecs = this.totalDurationSeconds - this.timeRemaining;
    return Math.max(0, Math.floor(elapsedSecs / 60));
  }

  get progressPercent(): number {
    if (!this.totalDurationSeconds) return 0;
    const elapsed = this.totalDurationSeconds - this.timeRemaining;
    return Math.min(100, Math.max(0, Math.round((elapsed / this.totalDurationSeconds) * 100)));
  }

  get formattedTime(): string {
    const mins = Math.floor(this.timeRemaining / 60);
    const secs = this.timeRemaining % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  get isPaused(): boolean {
    return !this.isRunning && this.timeRemaining < this.totalDurationSeconds && this.timeRemaining > 0;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadSession(id);
      } else {
        this.loadTodayNextSession();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatLocalDate(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  setSession(session: Session): void {
    this.session = session;
    this.topicTip = '';
    this.timerFinished = false;
    this.showPartialModal = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isRunning = false;
    const remainingMins = (session.durationMinutes || 50) - (session.actualMinutesSpent || 0);
    this.timeRemaining = (remainingMins > 0 ? remainingMins : session.durationMinutes || 50) * 60;
  }

  loadSession(id: string): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.sessionService.getSessionById(id).subscribe({
      next: (res) => {
        if (res.data) {
          this.setSession(res.data);
          this.notFound = false;
          this.allCaughtUp = false;
        } else {
          this.session = null;
          this.notFound = true;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.session = null;
        this.notFound = true;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadTodayNextSession(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.sessionService.getSessions().subscribe({
      next: (res) => {
        const sessions = res.data || [];
        const todayStr = this.formatLocalDate(new Date());

        this.todaySessions = sessions.filter(
          (s) => this.formatLocalDate(s.date) === todayStr
        );

        // Next relevant candidate: earliest uncompleted session today (SCHEDULED or PARTIALLY_COMPLETED)
        const nextActive = this.todaySessions.find(
          (s) => s.status === 'SCHEDULED' || s.status === 'PARTIALLY_COMPLETED'
        );

        if (nextActive) {
          this.setSession(nextActive);
          this.allCaughtUp = false;
          this.notFound = false;
        } else {
          // No uncompleted sessions remaining today -> Friendly empty state
          this.session = null;
          this.allCaughtUp = true;
          this.notFound = false;

          // Check if there is an upcoming session in the future
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          this.nextUpcomingSession =
            sessions.find((s) => {
              const sDate = new Date(s.date);
              sDate.setHours(0, 0, 0, 0);
              return sDate > now && (s.status === 'SCHEDULED' || s.status === 'PARTIALLY_COMPLETED');
            }) || null;
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load sessions for focus mode:', err);
        this.session = null;
        this.allCaughtUp = true;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectTodaySession(s: Session): void {
    if (this.session?._id === s._id) return;
    this.setSession(s);
    this.cdr.detectChanges();
  }

  startTimer(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timerFinished = false;
    this.timerInterval = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
        this.cdr.detectChanges();
      } else {
        this.pauseTimer();
        this.timerFinished = true;
        this.cdr.detectChanges();
      }
    }, 1000);
    this.cdr.detectChanges();
  }

  pauseTimer(): void {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.cdr.detectChanges();
  }

  resetTimer(): void {
    this.pauseTimer();
    this.timerFinished = false;
    if (this.session) {
      const remainingMins = (this.session.durationMinutes || 50) - (this.session.actualMinutesSpent || 0);
      this.timeRemaining = (remainingMins > 0 ? remainingMins : this.session.durationMinutes || 50) * 60;
    }
    this.cdr.detectChanges();
  }

  fetchTopicTip(): void {
    if (!this.session?.topicId?._id) return;
    this.loadingTip = true;
    this.cdr.detectChanges();
    this.sessionService.getTopicTip(this.session.topicId._id).subscribe({
      next: (res) => {
        this.topicTip = res.tip;
        this.loadingTip = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingTip = false;
        this.cdr.detectChanges();
      },
    });
  }

  completeSession(): void {
    if (!this.session || this.isSubmitting) return;
    this.isSubmitting = true;
    this.cdr.detectChanges();
    this.sessionService.updateStatus(this.session._id, 'COMPLETED', this.session.durationMinutes).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/timetable']);
      },
      error: (err) => {
        console.error('Failed to complete session:', err);
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  markMissedAndReschedule(): void {
    if (!this.session || this.isSubmitting) return;
    this.isSubmitting = true;
    this.cdr.detectChanges();
    this.sessionService.triggerReschedule(this.session._id, 0).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/timetable']);
      },
      error: (err) => {
        console.error('Failed to mark missed:', err);
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  openPartialModal(): void {
    if (!this.session) return;
    const suggestedMins = this.elapsedMinutes > 0 ? this.elapsedMinutes : Math.floor((this.session.durationMinutes || 50) / 2);
    this.partialMinutes = Math.max(5, Math.min(suggestedMins, (this.session.durationMinutes || 50) - 1));
    this.showPartialModal = true;
    this.cdr.detectChanges();
  }

  closePartialModal(): void {
    this.showPartialModal = false;
    this.cdr.detectChanges();
  }

  setPresetPartialMinutes(mins: number): void {
    if (!this.session) return;
    if (mins < this.session.durationMinutes) {
      this.partialMinutes = mins;
      this.cdr.detectChanges();
    }
  }

  submitPartialCompletion(): void {
    if (!this.session || this.isSubmitting) return;
    this.isSubmitting = true;
    this.cdr.detectChanges();
    this.sessionService.triggerReschedule(this.session._id, this.partialMinutes).subscribe({
      next: () => {
        this.showPartialModal = false;
        this.isSubmitting = false;
        this.router.navigate(['/timetable']);
      },
      error: (err) => {
        console.error('Failed to adapt partial session:', err);
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }
}
