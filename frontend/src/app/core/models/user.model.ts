export interface UserPreferences {
  dailyAvailableHours: number;
  preferredPeriod: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  energyPeakTime: 'EARLY_DAY' | 'LATE_DAY';
  sessionDurationMinutes: number;
  breakDurationMinutes: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  preferences: UserPreferences;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}
