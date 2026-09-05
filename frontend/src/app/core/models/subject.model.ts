export interface Topic {
  _id?: string;
  subjectId: string;
  userId?: string;
  title: string;
  estimatedHours: number;
  difficulty: number; // 1 to 5
  confidenceLevel: number; // 1 to 5
  completedHours?: number;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  revisionCount?: number;
  lastStudiedAt?: string | null;
}

export interface Subject {
  _id: string;
  userId?: string;
  name: string;
  color: string;
  examDate: string;
  priorityWeight: number; // 1 to 5
  topics?: Topic[];
  totalTopics?: number;
  totalHours?: number;
  completedHours?: number;
  progressPercent?: number;
}
