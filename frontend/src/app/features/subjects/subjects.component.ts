import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { SubjectService } from '../../core/services/subject.service';
import { PlanService } from '../../core/services/plan.service';
import { Subject, Topic } from '../../core/models/subject.model';

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subjects.component.html',
  styleUrls: ['./subjects.component.css'],
})
export class SubjectsComponent implements OnInit {
  subjects: Subject[] = [];
  loading = true;
  loadError = '';
  generatingPlan = false;
  planError = '';

  showSubjectModal = false;
  showTopicModal = false;
  activeSubjectForTopic: Subject | null = null;

  subjectModalError = '';
  topicModalError = '';

  colorOptions = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  newSubject = {
    name: '',
    examDate: '',
    color: '#4f46e5',
    priorityWeight: 3,
  };

  newTopic = {
    title: '',
    estimatedHours: 2,
    difficulty: 3,
    confidenceLevel: 3,
  };

  private subjectService = inject(SubjectService);
  private planService = inject(PlanService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  get minExamDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${tomorrow.getFullYear()}-${month}-${day}`;
  }

  ngOnInit(): void {
    this.loadSubjects();
  }

  loadSubjects(): void {
    this.loading = true;
    this.loadError = '';
    this.cdr.markForCheck();

    this.subjectService.getSubjects().subscribe({
      next: (res) => {
        this.subjects = Array.isArray(res?.data) ? res.data : [];
        this.loading = false;
        this.loadError = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.loadError = err.userMessage || err.error?.message || 'Failed to load subjects. Please check your network connection and try again.';
        this.cdr.detectChanges();
      },
    });
  }

  getDaysUntil(dateStr: string): number {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  getTotalTopics(): number {
    return this.subjects.reduce((acc, s) => acc + (s.topics?.length || 0), 0);
  }

  get totalTopics(): number {
    return this.getTotalTopics();
  }

  get totalHours(): number {
    return Math.round(this.subjects.reduce((acc, s) => acc + (s.totalHours || 0), 0) * 10) / 10;
  }

  get overallProgress(): number {
    if (this.subjects.length === 0) return 0;
    const total = this.totalHours;
    if (total === 0) return 0;
    const completed = this.subjects.reduce((acc, s) => acc + (s.completedHours || 0), 0);
    return Math.min(100, Math.round((completed / total) * 100));
  }

  getGeneratePlanTooltip(): string {
    if (this.subjects.length === 0) return 'Add at least one subject to generate your study plan.';
    if (this.totalTopics === 0) return 'Add topics to your subjects before generating your study timetable.';
    return 'Generate adaptive study plan';
  }

  saveSubject(): void {
    this.subjectModalError = '';
    this.subjectService.createSubject(this.newSubject).subscribe({
      next: () => {
        this.showSubjectModal = false;
        this.subjectModalError = '';
        this.newSubject = { name: '', examDate: '', color: '#4f46e5', priorityWeight: 3 };
        this.loadSubjects();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.subjectModalError = err.userMessage || err.error?.message || 'Failed to save subject.';
        this.cdr.detectChanges();
      },
    });
  }

  deleteSubject(id: string): void {
    if (confirm('Are you sure you want to delete this subject and all its topics?')) {
      this.subjectService.deleteSubject(id).subscribe({
        next: () => {
          this.loadSubjects();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.planError = err.userMessage || err.error?.message || 'Failed to delete subject.';
          this.cdr.detectChanges();
        },
      });
    }
  }

  openTopicModal(subject: Subject): void {
    this.activeSubjectForTopic = subject;
    this.topicModalError = '';
    this.newTopic = { title: '', estimatedHours: 2, difficulty: 3, confidenceLevel: 3 };
    this.showTopicModal = true;
  }

  saveTopic(): void {
    if (!this.activeSubjectForTopic) return;
    this.topicModalError = '';
    this.subjectService.createTopic(this.activeSubjectForTopic._id, this.newTopic).subscribe({
      next: () => {
        this.showTopicModal = false;
        this.topicModalError = '';
        this.loadSubjects();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.topicModalError = err.userMessage || err.error?.message || 'Failed to add topic.';
        this.cdr.detectChanges();
      },
    });
  }

  deleteTopic(topicId: string): void {
    this.subjectService.deleteTopic(topicId).subscribe({
      next: () => {
        this.loadSubjects();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.planError = err.userMessage || err.error?.message || 'Failed to delete topic.';
        this.cdr.detectChanges();
      },
    });
  }

  onGeneratePlan(): void {
    this.generatingPlan = true;
    this.planError = '';
    this.cdr.detectChanges();

    this.planService.generatePlan().subscribe({
      next: () => {
        this.generatingPlan = false;
        this.router.navigate(['/timetable']);
      },
      error: (err) => {
        this.generatingPlan = false;
        this.planError = err.userMessage || err.error?.message || 'Failed to generate study plan.';
      },
    });
  }

  // --- SYLLABUS PDF IMPORT METHODS ---

  showPdfModal = false;
  activeSubjectForPdf: Subject | null = null;
  pdfFile: File | null = null;
  pdfFileName = '';
  pdfFileSize = '';
  pdfExtracting = false;
  pdfImporting = false;
  pdfModalError = '';
  pdfWarning = '';
  pdfSource = '';
  pdfModalStep: 'upload' | 'review' = 'upload';
  successBanner = '';

  extractedUnits: Array<{
    unitName: string;
    topics: Array<{
      title: string;
      estimatedHours: number;
      difficulty: number;
      selected: boolean;
      isDuplicate: boolean;
    }>;
  }> = [];

  openPdfModal(subject: Subject): void {
    this.activeSubjectForPdf = subject;
    this.pdfFile = null;
    this.pdfFileName = '';
    this.pdfFileSize = '';
    this.pdfExtracting = false;
    this.pdfImporting = false;
    this.pdfModalError = '';
    this.pdfWarning = '';
    this.pdfSource = '';
    this.pdfModalStep = 'upload';
    this.extractedUnits = [];
    this.showPdfModal = true;
  }

  closePdfModal(): void {
    if (this.pdfExtracting || this.pdfImporting) return;
    this.showPdfModal = false;
    this.activeSubjectForPdf = null;
  }

  onPdfFileDropped(event: DragEvent): void {
    event.preventDefault();
    if (!event.dataTransfer?.files || event.dataTransfer.files.length === 0) return;
    this.handleSelectedPdfFile(event.dataTransfer.files[0]);
  }

  onPdfFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.handleSelectedPdfFile(input.files[0]);
  }

  handleSelectedPdfFile(file: File): void {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      this.pdfModalError = 'Please select a valid PDF file (.pdf).';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.pdfModalError = 'PDF file size exceeds 5MB limit. Please choose a smaller file.';
      return;
    }

    this.pdfModalError = '';
    this.pdfFile = file;
    this.pdfFileName = file.name;
    this.pdfFileSize = this.formatFileSize(file.size);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  extractSyllabusPdf(): void {
    if (!this.activeSubjectForPdf || !this.pdfFile || this.pdfExtracting) return;

    this.pdfExtracting = true;
    this.pdfModalError = '';
    this.pdfWarning = '';

    const subjectId = this.activeSubjectForPdf._id;
    const file = this.pdfFile;

    this.subjectService
      .extractSyllabusPdf(subjectId, file)
      .pipe(
        finalize(() => {
          this.pdfExtracting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          try {
            this.pdfSource = res?.source || res?.data?.source || 'fallback';
            this.pdfWarning = res?.warning || res?.data?.warning || '';

            // Safe extraction of existing topic titles
            const rawTitles = res?.existingTopicTitles || res?.data?.existingTopicTitles || [];
            const existingSet = new Set(
              (Array.isArray(rawTitles) ? rawTitles : [])
                .filter((t: any) => typeof t === 'string')
                .map((t: string) => t.trim().toLowerCase())
            );

            // Safe extraction of units
            const rawUnits = res?.units || res?.data?.units || [];
            const validUnitsArray = Array.isArray(rawUnits) ? rawUnits : [];

            this.extractedUnits = validUnitsArray.map((unit: any) => {
              const uName = (unit?.unitName || unit?.title || 'Curriculum Topics').toString().trim();
              const rawTopics = Array.isArray(unit?.topics) ? unit.topics : [];

              const topics = rawTopics.map((topic: any) => {
                const rawTitle = typeof topic === 'string' ? topic : (topic?.title || topic?.name || '');
                const cleanTitle = (rawTitle || '').toString().trim();
                const isDup = existingSet.has(cleanTitle.toLowerCase());
                return {
                  title: cleanTitle || 'Topic',
                  estimatedHours: Math.min(50, Math.max(0.5, Number(topic?.estimatedHours) || 2)),
                  difficulty: Math.min(5, Math.max(1, Math.round(Number(topic?.difficulty) || 3))),
                  selected: !isDup,
                  isDuplicate: isDup,
                };
              });

              return {
                unitName: uName,
                title: uName,
                topics,
              };
            });

            // Transition to review modal step
            this.pdfModalStep = 'review';
          } catch (err: any) {
            console.error('[PrepPilot PDF Extraction Error]:', err);
            this.pdfModalError = 'Could not parse extracted topics structure. Please try again.';
          } finally {
            this.pdfExtracting = false;
            this.cdr.detectChanges();
          }
        },
        error: (err: any) => {
          this.pdfExtracting = false;
          this.pdfModalError =
            err.error?.message || err.userMessage || 'Failed to extract topics from PDF. Please check the document format.';
          this.cdr.detectChanges();
        },
      });
  }

  isUnitAllSelected(unit: { topics: Array<{ selected: boolean }> }): boolean {
    return unit.topics.length > 0 && unit.topics.every((t) => t.selected);
  }

  isUnitPartiallySelected(unit: { topics: Array<{ selected: boolean }> }): boolean {
    const selectedCount = unit.topics.filter((t) => t.selected).length;
    return selectedCount > 0 && selectedCount < unit.topics.length;
  }

  toggleUnitTopics(unit: { topics: Array<{ selected: boolean }> }, event: Event): void {
    const target = event.target as HTMLInputElement;
    unit.topics.forEach((t) => (t.selected = target.checked));
  }

  selectAllTopics(selected: boolean): void {
    this.extractedUnits.forEach((u) => u.topics.forEach((t) => (t.selected = selected)));
  }

  getSelectedTopicsCount(): number {
    return this.extractedUnits.reduce((acc, u) => acc + u.topics.filter((t) => t.selected).length, 0);
  }

  getTotalExtractedTopicsCount(): number {
    return this.extractedUnits.reduce((acc, u) => acc + u.topics.length, 0);
  }

  getSelectedHours(): number {
    const total = this.extractedUnits.reduce(
      (acc, u) => acc + u.topics.filter((t) => t.selected).reduce((tAcc, t) => tAcc + (Number(t.estimatedHours) || 0), 0),
      0
    );
    return Math.round(total * 10) / 10;
  }

  addTopicToUnit(unit: { topics: Array<{ title: string; estimatedHours: number; difficulty: number; selected: boolean; isDuplicate: boolean }> }): void {
    unit.topics.push({
      title: 'New Chapter / Topic',
      estimatedHours: 2,
      difficulty: 3,
      selected: true,
      isDuplicate: false,
    });
  }

  removeTopic(unit: { topics: Array<any> }, index: number): void {
    unit.topics.splice(index, 1);
  }

  confirmImportTopics(): void {
    if (!this.activeSubjectForPdf || this.pdfImporting) return;

    const selectedTopics: Array<{ title: string; estimatedHours: number; difficulty: number; confidenceLevel: number }> = [];

    for (const unit of this.extractedUnits) {
      for (const t of unit.topics) {
        if (t.selected && (t.title || '').trim().length >= 2) {
          selectedTopics.push({
            title: t.title.trim(),
            estimatedHours: Math.min(50, Math.max(0.5, Number(t.estimatedHours) || 2)),
            difficulty: Math.min(5, Math.max(1, Math.round(Number(t.difficulty) || 3))),
            confidenceLevel: 3,
          });
        }
      }
    }

    if (selectedTopics.length === 0) {
      this.pdfModalError = 'Please select at least one topic to import.';
      return;
    }

    this.pdfImporting = true;
    this.pdfModalError = '';

    const subjectId = this.activeSubjectForPdf._id;
    const subjectName = this.activeSubjectForPdf.name;

    this.subjectService
      .importTopics(subjectId, selectedTopics)
      .pipe(
        finalize(() => {
          this.pdfImporting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          this.pdfImporting = false;
          this.showPdfModal = false;
          this.successBanner = `🎉 Successfully imported ${res.count} topics into ${subjectName}!`;
          setTimeout(() => (this.successBanner = ''), 6000);

          // Instantly update subject topics & counts in local memory
          const targetSubject = this.subjects.find((s) => s._id === subjectId);
          if (targetSubject && res.data) {
            targetSubject.topics = res.data;
            targetSubject.totalTopics = res.summary?.totalTopics ?? res.data.length;
            targetSubject.totalHours = res.summary?.totalHours ?? 0;
            targetSubject.completedHours = res.summary?.completedHours ?? 0;
            targetSubject.progressPercent = res.summary?.progressPercent ?? 0;
          }

          this.loadSubjects();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.pdfImporting = false;
          this.pdfModalError = err.error?.message || err.userMessage || 'Failed to import topics. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }
}
