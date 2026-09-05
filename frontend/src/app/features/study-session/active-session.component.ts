import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { Session } from '../../core/models/session.model';

@Component({
  selector: 'app-active-session',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './active-session.component.html',
  styleUrls: ['./active-session.component.css'],
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
