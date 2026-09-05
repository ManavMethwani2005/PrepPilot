import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Subject, Topic } from '../models/subject.model';

@Injectable({
  providedIn: 'root',
})
export class SubjectService {
  private readonly apiUrl = `${environment.apiUrl}/subjects`;

  constructor(private http: HttpClient) {}

  getSubjects(): Observable<{ success: boolean; data: Subject[] }> {
    return this.http.get<{ success: boolean; data: Subject[] }>(this.apiUrl);
  }

  createSubject(subject: Partial<Subject>): Observable<{ success: boolean; data: Subject }> {
    return this.http.post<{ success: boolean; data: Subject }>(this.apiUrl, subject);
  }

  updateSubject(id: string, subject: Partial<Subject>): Observable<{ success: boolean; data: Subject }> {
    return this.http.put<{ success: boolean; data: Subject }>(`${this.apiUrl}/${id}`, subject);
  }

  deleteSubject(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  createTopic(subjectId: string, topic: Partial<Topic>): Observable<{ success: boolean; data: Topic }> {
    return this.http.post<{ success: boolean; data: Topic }>(`${this.apiUrl}/${subjectId}/topics`, topic);
  }

  updateTopic(id: string, topic: Partial<Topic>): Observable<{ success: boolean; data: Topic }> {
    return this.http.put<{ success: boolean; data: Topic }>(`${this.apiUrl}/topics/${id}`, topic);
  }

  deleteTopic(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/topics/${id}`);
  }

  extractSyllabusPdf(subjectId: string, file: File): Observable<{
    success: boolean;
    subjectId?: string;
    subjectName?: string;
    units?: Array<{ unitName?: string; title?: string; topics?: Array<{ title?: string; estimatedHours?: number; difficulty?: number }> }>;
    source?: string;
    warning?: string;
    totalExtracted?: number;
    existingTopicTitles?: string[];
    data?: any;
  }> {
    const formData = new FormData();
    formData.append('syllabusPdf', file);
    return this.http.post<any>(`${this.apiUrl}/${subjectId}/syllabus/extract`, formData);
  }

  importTopics(subjectId: string, topics: any[]): Observable<{
    success: boolean;
    count: number;
    skippedDuplicates: number;
    data: Topic[];
    summary: { totalTopics: number; totalHours: number; completedHours?: number; progressPercent: number };
  }> {
    return this.http.post<any>(`${this.apiUrl}/${subjectId}/syllabus/import-topics`, { topics });
  }
}

