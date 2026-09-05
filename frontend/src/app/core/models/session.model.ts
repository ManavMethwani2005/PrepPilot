import { Subject, Topic } from './subject.model';

export interface Session {
  _id: string;
  planId: string;
  userId: string;
  subjectId?: Subject | null;
  topicId?: Topic | null;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  sessionType: 'LEARNING' | 'REVISION' | 'PRACTICE' | 'BUFFER';
  status: 'SCHEDULED' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'MISSED';
  actualMinutesSpent: number;
  completedAt?: string | null;
  notes?: string;
}

export interface RescheduleResult {
  strategy: string;
  explanation: string;
  affectedSessionIds?: string[];
  adjustedSessions?: Session[];
}
