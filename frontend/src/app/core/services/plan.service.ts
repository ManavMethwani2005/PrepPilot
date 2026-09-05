import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlanStats, StudyPlan } from '../models/plan.model';

@Injectable({
  providedIn: 'root',
})
export class PlanService {
  private readonly apiUrl = `${environment.apiUrl}/plans`;

  constructor(private http: HttpClient) {}

  generatePlan(startDate?: string, endDate?: string): Observable<{
    success: boolean;
    data: {
      plan: StudyPlan;
      totalSessions: number;
      totalHours: number;
      geminiSummary: string;
      strategicTip: string;
    };
  }> {
    return this.http.post<any>(`${this.apiUrl}/generate`, { startDate, endDate });
  }

  getActivePlan(): Observable<{ success: boolean; data: StudyPlan | null }> {
    return this.http.get<{ success: boolean; data: StudyPlan | null }>(`${this.apiUrl}/active`);
  }

  getPlanStats(): Observable<{ success: boolean; data: PlanStats }> {
    return this.http.get<{ success: boolean; data: PlanStats }>(`${this.apiUrl}/stats`);
  }
}
