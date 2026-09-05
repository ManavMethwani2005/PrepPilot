import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RescheduleResult, Session } from '../models/session.model';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly sessionUrl = `${environment.apiUrl}/sessions`;
  private readonly rescheduleUrl = `${environment.apiUrl}/reschedule`;

  constructor(private http: HttpClient) {}

  getSessions(startDate?: string, endDate?: string): Observable<{ success: boolean; count: number; data: Session[] }> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<{ success: boolean; count: number; data: Session[] }>(this.sessionUrl, { params });
  }

  getSessionById(id: string): Observable<{ success: boolean; data: Session }> {
    return this.http.get<{ success: boolean; data: Session }>(`${this.sessionUrl}/${id}`);
  }

  updateStatus(
    sessionId: string,
    status: 'SCHEDULED' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'MISSED',
    actualMinutesSpent?: number,
    notes?: string
  ): Observable<{ success: boolean; data: Session; requiresReschedule: boolean }> {
    return this.http.patch<{ success: boolean; data: Session; requiresReschedule: boolean }>(
      `${this.sessionUrl}/${sessionId}/status`,
      { status, actualMinutesSpent, notes }
    );
  }

  triggerReschedule(sessionId: string, actualMinutes: number = 0): Observable<{ success: boolean; data: RescheduleResult }> {
    return this.http.post<{ success: boolean; data: RescheduleResult }>(
      `${this.rescheduleUrl}/recalculate`,
      { sessionId, actualMinutes }
    );
  }

  getTopicTip(topicId: string): Observable<{ success: boolean; tip: string }> {
    return this.http.get<{ success: boolean; tip: string }>(`${this.rescheduleUrl}/topic-tip/${topicId}`);
  }
}
