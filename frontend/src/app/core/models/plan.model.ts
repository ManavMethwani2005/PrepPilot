import { Session } from './session.model';

export interface StudyPlan {
  _id: string;
  userId: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  totalAllocatedHours: number;
  geminiSummary: string;
  strategicTip: string;
  createdAt?: string;
}

export interface PlanStats {
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  upcomingExams: number;
  todaySessions: Session[];
}
