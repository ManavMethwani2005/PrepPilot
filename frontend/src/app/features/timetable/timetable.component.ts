import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { RescheduleResult, Session } from '../../core/models/session.model';

type ViewMode = 'today' | 'week' | 'agenda';
type FilterType = 'ALL' | 'LEARNING' | 'REVISION' | 'BUFFER' | 'COMPLETED' | 'REMAINING';

@Component({
  selector: 'app-timetable',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './timetable.component.html',
  styleUrls: ['./timetable.component.css'],
})
export class TimetableComponent implements OnInit {
  sessions: Session[] = [];
  loading = true;
  weekOffset = 0;
  weekStart = new Date();
  weekEnd = new Date();

  groupedDays: { date: Date; dateStr: string; sessions: Session[] }[] = [];
  rescheduleResult: RescheduleResult | null = null;
  statusNotice: string | null = null;
  adaptedTopicTitle: string | null = null;

  showPartialModal = false;
  activeSessionForPartial: Session | null = null;
  partialMinutes = 20;

  activeView: ViewMode = 'week';
  activeFilter: FilterType = 'ALL';

  private sessionService = inject(SessionService);
  private cdr = inject(ChangeDetectorRef);

  get todayDate(): Date {
    return new Date();
  }

  get todayDateStr(): string {
    return this.formatLocalDate(new Date());
  }

  get todaySessions(): Session[] {
    return this.sessions.filter((s) => this.formatLocalDate(s.date) === this.todayDateStr);
  }

  get filteredTodaySessions(): Session[] {
    return this.getFilteredSessions(this.todaySessions);
  }

  get todayCompletedSessions(): number {
    return this.todaySessions.filter((s) => s.status === 'COMPLETED').length;
  }

  get todayPlannedFocusFormatted(): string {
    const totalMins = this.todaySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  get totalWeekSessions(): number {
    return this.sessions.length;
  }

  get completedWeekSessions(): number {
    return this.sessions.filter((s) => s.status === 'COMPLETED').length;
  }

  get remainingWeekSessions(): number {
    return this.sessions.filter((s) => s.status !== 'COMPLETED').length;
  }

  get totalWeekHoursFormatted(): string {
    const mins = this.sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  get weeklyProgressPercent(): number {
    if (this.sessions.length === 0) return 0;
    return Math.round((this.completedWeekSessions / this.sessions.length) * 100);
  }

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.activeView = 'today';
    } else {
      this.activeView = 'week';
    }
    this.calculateWeekRange();
    this.loadSessions();
  }

  formatLocalDate(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  setView(view: ViewMode): void {
    this.activeView = view;
  }

  setFilter(filter: FilterType): void {
    this.activeFilter = filter;
  }

  dismissNotice(): void {
    this.rescheduleResult = null;
    this.statusNotice = null;
    this.adaptedTopicTitle = null;
  }

  countByType(type: 'LEARNING' | 'REVISION' | 'BUFFER'): number {
    return this.sessions.filter((s) => s.sessionType === type).length;
  }

  getFilteredSessions(sessions: Session[]): Session[] {
    if (!sessions) return [];
    if (this.activeFilter === 'ALL') return sessions;
    if (this.activeFilter === 'LEARNING') return sessions.filter((s) => s.sessionType === 'LEARNING');
    if (this.activeFilter === 'REVISION') return sessions.filter((s) => s.sessionType === 'REVISION');
    if (this.activeFilter === 'BUFFER') return sessions.filter((s) => s.sessionType === 'BUFFER');
    if (this.activeFilter === 'COMPLETED') return sessions.filter((s) => s.status === 'COMPLETED');
    if (this.activeFilter === 'REMAINING') return sessions.filter((s) => s.status !== 'COMPLETED');
    return sessions;
  }

  loadSessions(): void {
    this.loading = true;
    this.cdr.markForCheck();
    const startStr = this.weekStart.toISOString();
    const endStr = this.weekEnd.toISOString();

    this.sessionService.getSessions(startStr, endStr).subscribe({
      next: (res) => {
        this.sessions = res.data || [];
        this.groupSessionsByDay();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  groupSessionsByDay(): void {
    const groups: { [key: string]: { date: Date; dateStr: string; sessions: Session[] } } = {};

    for (let i = 0; i < 7; i++) {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = this.formatLocalDate(d);
      groups[dateStr] = { date: d, dateStr, sessions: [] };
    }

    this.sessions.forEach((s) => {
      const dateStr = this.formatLocalDate(s.date);
      if (groups[dateStr]) {
        groups[dateStr].sessions.push(s);
      }
    });

    this.groupedDays = Object.values(groups);
  }

  isToday(dateStr: string): boolean {
    return dateStr === this.todayDateStr;
  }

  getDayTotalMinutes(daySessions: Session[]): number {
    return (daySessions || []).reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
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
    if (status === 'COMPLETED') {
      this.statusNotice = `Marked "${session.topicId?.title || 'Session'}" as completed!`;
    } else if (status === 'SCHEDULED') {
      this.statusNotice = null;
    }
    this.sessionService.updateStatus(session._id, status).subscribe({
      next: () => this.loadSessions(),
    });
  }

  triggerMissedAdaptive(session: Session): void {
    this.statusNotice = 'Life happens. PrepPilot will find the next suitable slot.';
    this.adaptedTopicTitle = session.topicId?.title || (session.sessionType === 'BUFFER' ? 'Buffer Slot' : 'Revision Session');
    this.sessionService.triggerReschedule(session._id, 0).subscribe({
      next: (res) => {
        this.rescheduleResult = res.data;
        this.loadSessions();
      },
      error: () => {
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
    const session = this.activeSessionForPartial;
    this.statusNotice = 'Partial completion recorded. PrepPilot will adjust the remaining work.';
    this.adaptedTopicTitle = session.topicId?.title || (session.sessionType === 'BUFFER' ? 'Buffer Slot' : 'Revision Session');
    this.sessionService.triggerReschedule(session._id, this.partialMinutes).subscribe({
      next: (res) => {
        this.showPartialModal = false;
        this.rescheduleResult = res.data;
        this.loadSessions();
      },
      error: () => {
        this.showPartialModal = false;
        this.loadSessions();
      },
    });
  }
}
