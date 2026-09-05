import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SubjectService } from '../../core/services/subject.service';
import { PlanService } from '../../core/services/plan.service';
import { Subject, Topic } from '../../core/models/subject.model';

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container subjects-container">
      <div class="page-header">
        <div>
          <h2>Subjects & Exam Deadlines</h2>
          <p>Structure your syllabus, set topic difficulty and confidence to power PrepPilot's deterministic AI scheduler.</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="showSubjectModal = true">+ Add Subject</button>
          <button
            class="btn-primary"
            (click)="onGeneratePlan()"
            [disabled]="generatingPlan || subjects.length === 0 || getTotalTopics() === 0"
            [title]="getGeneratePlanTooltip()"
          >
            @if (generatingPlan) {
              <span>⚡ Generating Adaptive Schedule (Gemini AI)...</span>
            } @else {
              <span>⚡ Generate Study Schedule</span>
            }
          </button>
        </div>
      </div>

      <!-- Syllabus KPIs Summary Bar -->
      @if (!loading && subjects.length > 0) {
        <div class="syllabus-kpi-grid">
          <div class="card kpi-card">
            <span class="kpi-label">Total Subjects</span>
            <span class="kpi-val">{{ subjects.length }}</span>
          </div>
          <div class="card kpi-card">
            <span class="kpi-label">Total Topics</span>
            <span class="kpi-val">{{ totalTopics }}</span>
          </div>
          <div class="card kpi-card">
            <span class="kpi-label">Estimated Hours</span>
            <span class="kpi-val">{{ totalHours }}h</span>
          </div>
          <div class="card kpi-card">
            <span class="kpi-label">Syllabus Completed</span>
            <span class="kpi-val">{{ overallProgress }}%</span>
          </div>
        </div>
      }

      @if (successBanner) {
        <div class="alert alert-success">{{ successBanner }}</div>
      }

      @if (planError) {
        <div class="alert alert-danger">{{ planError }}</div>
      }

      @if (loading) {
        <div class="loading-state">
          <div class="skeleton-line" style="width: 50%; height: 24px; margin: 0 auto 12px;"></div>
          <div class="skeleton-line" style="width: 30%; height: 16px; margin: 0 auto;"></div>
        </div>
      } @else if (subjects.length === 0) {
        <div class="card empty-state">
          <div class="empty-icon">📚</div>
          <h3>No subjects added yet</h3>
          <p>Start by adding the subjects you are studying along with their upcoming exam dates.</p>
          <button class="btn-primary" (click)="showSubjectModal = true">+ Add Your First Subject</button>
        </div>
      } @else {
        <div class="subjects-grid">
          @for (subject of subjects; track subject._id) {
            <div class="card subject-card" [style.border-top]="'4px solid ' + subject.color">
              <div class="subject-header">
                <div>
                  <h3 class="subject-title">{{ subject.name }}</h3>
                  <div class="exam-info">
                    📅 Exam: {{ subject.examDate | date: 'mediumDate' }}
                    <span class="days-badge" [class.urgent]="getDaysUntil(subject.examDate) <= 7">
                      {{ getDaysUntil(subject.examDate) }} days left
                    </span>
                  </div>
                </div>
                <div class="subject-top-actions">
                  <span class="priority-tag">Priority {{ subject.priorityWeight }}/5</span>
                  <button class="btn-icon-delete" (click)="deleteSubject(subject._id)" title="Delete subject">✕</button>
                </div>
              </div>

              <!-- Subject Progress Bar -->
              <div class="progress-section">
                <div class="progress-labels">
                  <span>{{ subject.topics?.length || 0 }} Topics ({{ subject.totalHours || 0 }} hrs)</span>
                  <span>{{ subject.progressPercent || 0 }}% Done</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" [style.width.%]="subject.progressPercent || 0" [style.background]="subject.color"></div>
                </div>
              </div>

              <!-- Topics List -->
              <div class="topics-section">
                <div class="topics-header">
                  <h4>Topics & Chapters</h4>
                  <div class="topic-header-actions">
                    <button class="btn-import-syllabus" (click)="openPdfModal(subject)" title="Import topics from syllabus PDF">
                      📄 Import Syllabus PDF
                    </button>
                    <button class="btn-add-topic" (click)="openTopicModal(subject)">+ Add Topic</button>
                  </div>
                </div>

                @if (!subject.topics || subject.topics.length === 0) {
                  <p class="no-topics-text">No topics added. Click "+ Add Topic" to add chapters.</p>
                } @else {
                  <div class="topics-list">
                    @for (topic of subject.topics; track topic._id) {
                      <div class="topic-item">
                        <div class="topic-main">
                          <span class="topic-title">{{ topic.title }}</span>
                          <span class="topic-hours">{{ topic.estimatedHours }}h</span>
                        </div>
                        <div class="topic-meta">
                          <span class="badge diff-badge" [class]="'diff-' + topic.difficulty" title="Topic Difficulty">
                            Diff: {{ topic.difficulty }}/5
                          </span>
                          <span class="badge conf-badge" title="Current Student Confidence">
                            Conf: {{ topic.confidenceLevel }}/5
                          </span>
                          <button class="btn-delete-topic" (click)="deleteTopic(topic._id!)" title="Delete topic">✕</button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Add Subject Modal -->
      @if (showSubjectModal) {
        <div class="modal-backdrop" (click)="showSubjectModal = false">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3>Add New Subject</h3>
            <form (ngSubmit)="saveSubject()">
              @if (subjectModalError) {
                <div class="alert alert-danger">{{ subjectModalError }}</div>
              }

              <div class="form-group">
                <label>Subject Name</label>
                <input type="text" [(ngModel)]="newSubject.name" name="name" required maxlength="80" placeholder="e.g. Organic Chemistry" />
              </div>

              <div class="form-group">
                <label>Exam Date (must be in the future)</label>
                <input type="date" [(ngModel)]="newSubject.examDate" [min]="minExamDate" name="examDate" required />
              </div>

              <div class="form-group">
                <label>Accent Color</label>
                <div class="color-palette">
                  @for (c of colorOptions; track c) {
                    <div
                      class="color-circle"
                      [style.background]="c"
                      [class.active]="newSubject.color === c"
                      (click)="newSubject.color = c"
                    ></div>
                  }
                </div>
              </div>

              <div class="form-group">
                <label>Importance / Priority Weight (1 = Normal, 5 = Crucial)</label>
                <input type="range" min="1" max="5" [(ngModel)]="newSubject.priorityWeight" name="priorityWeight" />
                <div class="slider-ticks"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-secondary" (click)="showSubjectModal = false">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="!newSubject.name || !newSubject.examDate">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Add Topic Modal -->
      @if (showTopicModal && activeSubjectForTopic) {
        <div class="modal-backdrop" (click)="showTopicModal = false">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3>Add Topic to {{ activeSubjectForTopic.name }}</h3>
            <form (ngSubmit)="saveTopic()">
              @if (topicModalError) {
                <div class="alert alert-danger">{{ topicModalError }}</div>
              }

              <div class="form-group">
                <label>Topic / Chapter Title</label>
                <input type="text" [(ngModel)]="newTopic.title" name="topicTitle" required maxlength="120" placeholder="e.g. Reaction Mechanisms" />
              </div>

              <div class="form-group">
                <label>Estimated Hours to Master (0.5 to 50 hrs)</label>
                <input type="number" step="0.5" min="0.5" max="50" [(ngModel)]="newTopic.estimatedHours" name="hours" required />
              </div>

              <div class="form-group">
                <label>Topic Difficulty (1 = Very Easy, 5 = Very Hard)</label>
                <input type="range" min="1" max="5" [(ngModel)]="newTopic.difficulty" name="difficulty" />
                <div class="slider-ticks"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
              </div>

              <div class="form-group">
                <label>Current Confidence (1 = No clue, 5 = Confident)</label>
                <input type="range" min="1" max="5" [(ngModel)]="newTopic.confidenceLevel" name="confidence" />
                <div class="slider-ticks"><span>1 (Low)</span><span>3 (Moderate)</span><span>5 (Mastered)</span></div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-secondary" (click)="showTopicModal = false">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="!newTopic.title">Add Topic</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Syllabus PDF Import Modal -->
      @if (showPdfModal && activeSubjectForPdf) {
        <div class="modal-backdrop" (click)="closePdfModal()">
          <div class="modal-card modal-card-lg" (click)="$event.stopPropagation()">
            <div class="modal-header-row">
              <div>
                <h3>Import Syllabus PDF</h3>
                <p class="modal-subtitle">Subject: <strong>{{ activeSubjectForPdf.name }}</strong></p>
              </div>
              <button type="button" class="btn-close-modal" (click)="closePdfModal()" title="Close">✕</button>
            </div>

            @if (pdfModalError) {
              <div class="alert alert-danger" style="margin-top: 0.75rem;">{{ pdfModalError }}</div>
            }
            @if (pdfWarning) {
              <div class="alert alert-warning" style="margin-top: 0.75rem;">{{ pdfWarning }}</div>
            }

            <!-- Step 1: Upload PDF -->
            @if (pdfModalStep === 'upload') {
              <div class="pdf-upload-container">
                <div class="upload-dropzone" [class.has-file]="pdfFile !== null">
                  <input
                    type="file"
                    id="pdfFileInput"
                    accept=".pdf,application/pdf"
                    (change)="onPdfFileSelected($event)"
                    class="file-input-hidden"
                  />
                  <label for="pdfFileInput" class="dropzone-label">
                    <span class="upload-icon">📄</span>
                    @if (pdfFile) {
                      <div class="selected-file-info">
                        <span class="file-name">{{ pdfFileName }}</span>
                        <span class="file-size">({{ pdfFileSize }})</span>
                      </div>
                      <span class="btn-change-file">Click to choose a different PDF</span>
                    } @else {
                      <span class="upload-prompt">Click to select or drag a syllabus PDF here</span>
                      <span class="upload-hint">Supported: PDF document (max 5 MB)</span>
                    }
                  </label>
                </div>

                <div class="upload-guide-card">
                  <span class="guide-title">⚡ How AI Syllabus Extraction Works</span>
                  <p>PrepPilot securely processes your PDF in memory, extracts course chapters using Gemini AI, and displays them for you to review, edit, or customize before saving.</p>
                </div>

                <div class="modal-actions" style="margin-top: 1.5rem;">
                  <button type="button" class="btn-secondary" (click)="closePdfModal()">Cancel</button>
                  <button
                    type="button"
                    class="btn-primary"
                    [disabled]="!pdfFile || pdfExtracting"
                    (click)="extractSyllabusPdf()"
                  >
                    @if (pdfExtracting) {
                      <span>⚡ Extracting Topics with AI...</span>
                    } @else {
                      <span>⚡ Extract Topics with AI</span>
                    }
                  </button>
                </div>
              </div>
            }

            <!-- Step 2: Review Extracted Topics -->
            @if (pdfModalStep === 'review') {
              <div class="pdf-review-container">
                <div class="review-toolbar">
                  <div class="toolbar-stats">
                    <span class="badge-source" [class.ai]="pdfSource === 'ai'">
                      {{ pdfSource === 'ai' ? '🤖 Gemini AI' : '📋 Pattern Extractor' }}
                    </span>
                    <span class="stats-text">
                      <strong>{{ getSelectedTopicsCount() }}</strong> of {{ getTotalExtractedTopicsCount() }} topics selected ({{ getSelectedHours() }}h)
                    </span>
                  </div>
                  <div class="toolbar-actions">
                    <button type="button" class="btn-link" (click)="selectAllTopics(true)">Select All</button>
                    <span class="divider">•</span>
                    <button type="button" class="btn-link" (click)="selectAllTopics(false)">Deselect All</button>
                  </div>
                </div>

                <div class="units-review-scroll">
                  @for (unit of extractedUnits; track $index; let uIdx = $index) {
                    <div class="unit-review-card">
                      <div class="unit-card-header">
                        <label class="unit-toggle-label">
                          <input
                            type="checkbox"
                            [checked]="isUnitAllSelected(unit)"
                            [indeterminate]="isUnitPartiallySelected(unit)"
                            (change)="toggleUnitTopics(unit, $event)"
                          />
                          <input
                            type="text"
                            class="unit-title-input"
                            [(ngModel)]="unit.unitName"
                            placeholder="Unit Name"
                          />
                        </label>
                        <button type="button" class="btn-add-unit-topic" (click)="addTopicToUnit(unit)" title="Add topic to this unit">
                          + Add Topic
                        </button>
                      </div>

                      <div class="unit-topics-list">
                        @for (t of unit.topics; track $index; let tIdx = $index) {
                          <div class="review-topic-row" [class.topic-duplicate]="t.isDuplicate" [class.topic-unselected]="!t.selected">
                            <label class="topic-check-label">
                              <input type="checkbox" [(ngModel)]="t.selected" />
                            </label>

                            <div class="topic-title-wrapper">
                              <input
                                type="text"
                                class="topic-title-edit"
                                [(ngModel)]="t.title"
                                maxlength="120"
                                placeholder="Topic title"
                              />
                              @if (t.isDuplicate) {
                                <span class="badge-already-added" title="Topic with this title already exists in your subject">Already Added</span>
                              }
                            </div>

                            <div class="topic-field-hours">
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="50"
                                class="hours-input"
                                [(ngModel)]="t.estimatedHours"
                                title="Estimated Hours"
                              />
                              <span class="field-unit">h</span>
                            </div>

                            <div class="topic-field-diff">
                              <select [(ngModel)]="t.difficulty" class="diff-select" title="Difficulty rating">
                                <option [value]="1">Diff 1 (Very Easy)</option>
                                <option [value]="2">Diff 2 (Easy)</option>
                                <option [value]="3">Diff 3 (Medium)</option>
                                <option [value]="4">Diff 4 (Hard)</option>
                                <option [value]="5">Diff 5 (Very Hard)</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              class="btn-remove-review-topic"
                              (click)="removeTopic(unit, tIdx)"
                              title="Delete topic"
                            >
                              ✕
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>

                <div class="review-actions-bar">
                  <button type="button" class="btn-secondary" (click)="pdfModalStep = 'upload'">
                    ← Choose Another PDF
                  </button>
                  <div class="right-actions">
                    <button type="button" class="btn-secondary" (click)="closePdfModal()">Cancel</button>
                    <button
                      type="button"
                      class="btn-primary"
                      [disabled]="getSelectedTopicsCount() === 0 || pdfImporting"
                      (click)="confirmImportTopics()"
                    >
                      @if (pdfImporting) {
                        <span>Importing Topics...</span>
                      } @else {
                        <span>Import {{ getSelectedTopicsCount() }} Topics</span>
                      }
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .subjects-container {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .page-header h2 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }
    .page-header p {
      color: var(--text-muted);
      font-size: 0.95rem;
      margin-top: 0.15rem;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    /* Syllabus KPI Grid */
    .syllabus-kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.85rem;
    }
    .kpi-card {
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      background: #ffffff;
      border: 1px solid var(--border);
    }
    .kpi-label {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .kpi-val {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    .empty-icon {
      font-size: 3rem;
      margin-bottom: 0.25rem;
    }
    .empty-state h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .empty-state p {
      color: var(--text-muted);
      font-size: 0.9rem;
      max-width: 440px;
    }

    /* Subjects Grid */
    .subjects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.25rem;
    }
    .subject-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.25rem;
      background: #ffffff;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .subject-card:hover {
      box-shadow: var(--shadow-md);
    }
    .subject-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .subject-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
    }
    .exam-info {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-top: 0.3rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .days-badge {
      background: var(--primary-light);
      color: var(--primary-text);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-full);
      font-weight: 700;
      font-size: 0.72rem;
    }
    .days-badge.urgent {
      background: var(--danger-light);
      color: var(--danger-text);
      animation: pulse 2s infinite;
    }
    .subject-top-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }
    .priority-tag {
      font-size: 0.7rem;
      color: var(--text-muted);
      background: #f1f5f9;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
    }
    .btn-icon-delete {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1rem;
      padding: 0.2rem 0.4rem;
      cursor: pointer;
      border-radius: var(--radius-sm);
    }
    .btn-icon-delete:hover {
      color: var(--danger);
      background: #fee2e2;
    }

    /* Progress section */
    .progress-section {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.78rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .progress-bar-bg {
      height: 7px;
      background: #e2e8f0;
      border-radius: var(--radius-full);
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 0.4s ease;
    }

    /* Topics list */
    .topics-section {
      border-top: 1px solid var(--border);
      padding-top: 0.75rem;
    }
    .topics-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.6rem;
    }
    .topics-header h4 {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-main);
    }
    .topic-header-actions {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-wrap: wrap;
    }
    .btn-import-syllabus {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #15803d;
      font-size: 0.76rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      transition: all 0.15s ease;
    }
    .btn-import-syllabus:hover {
      background: #dcfce7;
      border-color: #86efac;
      color: #166534;
    }
    .btn-add-topic {
      background: transparent;
      border: 1px solid #c7d2fe;
      color: var(--primary);
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .btn-add-topic:hover {
      background: var(--primary-light);
    }
    .no-topics-text {
      font-size: 0.82rem;
      color: var(--text-muted);
      font-style: italic;
      padding: 0.5rem 0;
    }
    .topics-list {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      max-height: 220px;
      overflow-y: auto;
    }
    .topic-item {
      background: #f8fafc;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-md);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid var(--border);
      gap: 0.5rem;
    }
    .topic-main {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
    }
    .topic-title {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .topic-hours {
      font-size: 0.72rem;
      color: var(--text-muted);
      background: #ffffff;
      padding: 0.1rem 0.35rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      flex-shrink: 0;
    }
    .topic-meta {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-shrink: 0;
    }
    .diff-badge {
      font-size: 0.68rem;
      padding: 0.1rem 0.35rem;
    }
    .diff-1, .diff-2 { background: var(--success-light); color: var(--success-text); }
    .diff-3 { background: var(--warning-light); color: var(--warning-text); }
    .diff-4, .diff-5 { background: var(--danger-light); color: var(--danger-text); }
    .conf-badge {
      background: var(--secondary-light);
      color: var(--secondary);
      font-size: 0.68rem;
      padding: 0.1rem 0.35rem;
    }
    .btn-delete-topic {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.85rem;
      padding: 0.1rem 0.3rem;
      cursor: pointer;
      border-radius: var(--radius-sm);
    }
    .btn-delete-topic:hover {
      color: var(--danger);
      background: #fee2e2;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1rem;
    }
    .modal-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      padding: 1.75rem 2rem;
      width: 100%;
      max-width: 480px;
      box-shadow: var(--shadow-lg);
    }
    .modal-card h3 {
      margin-bottom: 1.25rem;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .form-group {
      margin-bottom: 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .color-palette {
      display: flex;
      gap: 0.6rem;
      padding: 0.25rem 0;
    }
    .color-circle {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      cursor: pointer;
      border: 3px solid transparent;
      transition: transform 0.15s ease;
    }
    .color-circle.active {
      border-color: #0f172a;
      transform: scale(1.15);
    }
    .slider-ticks {
      display: flex;
      justify-content: space-between;
      font-size: 0.72rem;
      color: var(--text-muted);
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
    .alert {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    .alert-danger {
      background: var(--danger-light);
      color: var(--danger-text);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .alert-success {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .alert-warning {
      background: #fefce8;
      color: #854d0e;
      border: 1px solid #fef08a;
    }

    /* PDF Modal & Review Styling */
    .modal-card-lg {
      max-width: 680px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      padding: 1.5rem 1.75rem;
    }
    .modal-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.25rem;
    }
    .modal-subtitle {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin-top: 0.15rem;
    }
    .btn-close-modal {
      background: transparent;
      border: none;
      font-size: 1.15rem;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.2rem 0.4rem;
      border-radius: var(--radius-sm);
    }
    .btn-close-modal:hover {
      color: var(--text-main);
      background: #f1f5f9;
    }
    .upload-dropzone {
      border: 2px dashed #cbd5e1;
      border-radius: var(--radius-lg);
      padding: 2.25rem 1.5rem;
      text-align: center;
      background: #f8fafc;
      transition: border-color 0.2s ease, background 0.2s ease;
      margin-top: 0.75rem;
    }
    .upload-dropzone.has-file {
      border-color: #10b981;
      background: #f0fdf4;
    }
    .file-input-hidden {
      display: none;
    }
    .dropzone-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
    .upload-icon {
      font-size: 2.5rem;
    }
    .upload-prompt {
      font-weight: 600;
      color: var(--text-main);
      font-size: 0.95rem;
    }
    .upload-hint {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .selected-file-info {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-weight: 600;
      color: #15803d;
      font-size: 0.95rem;
    }
    .file-name {
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .btn-change-file {
      font-size: 0.8rem;
      color: var(--primary);
      text-decoration: underline;
      margin-top: 0.25rem;
    }
    .upload-guide-card {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      margin-top: 1rem;
    }
    .guide-title {
      font-weight: 600;
      font-size: 0.85rem;
      color: #1e40af;
      display: block;
      margin-bottom: 0.25rem;
    }
    .upload-guide-card p {
      font-size: 0.82rem;
      color: #1e3a8a;
      line-height: 1.4;
      margin: 0;
    }
    .review-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.6rem 0.85rem;
      background: #f1f5f9;
      border-radius: var(--radius-md);
      margin-top: 0.75rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .toolbar-stats {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .badge-source {
      background: #e2e8f0;
      color: #475569;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .badge-source.ai {
      background: #ede9fe;
      color: #6d28d9;
    }
    .stats-text {
      font-size: 0.85rem;
      color: var(--text-main);
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-link {
      background: none;
      border: none;
      color: var(--primary);
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      padding: 0.1rem 0.25rem;
    }
    .btn-link:hover {
      text-decoration: underline;
    }
    .divider {
      color: #cbd5e1;
      font-size: 0.75rem;
    }
    .units-review-scroll {
      overflow-y: auto;
      max-height: 50vh;
      padding-right: 0.35rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin: 0.75rem 0;
    }
    .unit-review-card {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 0.75rem 0.85rem;
    }
    .unit-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      gap: 0.5rem;
    }
    .unit-toggle-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      cursor: pointer;
    }
    .unit-title-input {
      font-weight: 600;
      font-size: 0.92rem;
      color: var(--text-main);
      border: 1px solid transparent;
      background: transparent;
      padding: 0.2rem 0.4rem;
      border-radius: var(--radius-sm);
      flex: 1;
    }
    .unit-title-input:hover, .unit-title-input:focus {
      border-color: var(--border);
      background: #ffffff;
    }
    .btn-add-unit-topic {
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-add-unit-topic:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
    .review-topic-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.5rem;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      margin-bottom: 0.35rem;
      transition: opacity 0.15s ease;
    }
    .review-topic-row.topic-unselected {
      opacity: 0.55;
      background: #f8fafc;
    }
    .review-topic-row.topic-duplicate {
      border-left: 3px solid #f59e0b;
    }
    .topic-check-label {
      display: flex;
      align-items: center;
      cursor: pointer;
    }
    .topic-title-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      min-width: 0;
    }
    .topic-title-edit {
      flex: 1;
      border: 1px solid transparent;
      background: transparent;
      padding: 0.2rem 0.35rem;
      font-size: 0.85rem;
      color: var(--text-main);
      border-radius: var(--radius-sm);
      width: 100%;
    }
    .topic-title-edit:hover, .topic-title-edit:focus {
      border-color: var(--border);
      background: #f8fafc;
    }
    .badge-already-added {
      background: #fef3c7;
      color: #92400e;
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.1rem 0.35rem;
      border-radius: var(--radius-sm);
      margin-left: 0.35rem;
      flex-shrink: 0;
      white-space: nowrap;
    }
    .topic-field-hours {
      display: flex;
      align-items: center;
      gap: 0.15rem;
      flex-shrink: 0;
    }
    .hours-input {
      width: 48px;
      text-align: center;
      padding: 0.2rem;
      font-size: 0.82rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }
    .field-unit {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .topic-field-diff {
      flex-shrink: 0;
    }
    .diff-select {
      padding: 0.2rem 0.35rem;
      font-size: 0.78rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: #ffffff;
      color: var(--text-main);
    }
    .btn-remove-review-topic {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.85rem;
      cursor: pointer;
      padding: 0.15rem 0.35rem;
      border-radius: var(--radius-sm);
    }
    .btn-remove-review-topic:hover {
      color: var(--danger);
      background: #fee2e2;
    }
    .review-actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .right-actions {
      display: flex;
      gap: 0.5rem;
    }

    @media (max-width: 640px) {
      .subjects-grid {
        grid-template-columns: 1fr;
      }
      .syllabus-kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .modal-card-lg {
        padding: 1.15rem 1rem;
      }
      .review-topic-row {
        flex-wrap: wrap;
        gap: 0.35rem;
      }
      .topic-title-wrapper {
        flex: 1 1 calc(100% - 32px);
      }
      .review-actions-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .right-actions {
        justify-content: flex-end;
      }
    }
  `],
})
export class SubjectsComponent implements OnInit {
  subjects: Subject[] = [];
  loading = true;
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
    this.subjectService.getSubjects().subscribe({
      next: (res) => {
        this.subjects = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
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
      },
      error: (err) => {
        this.subjectModalError = err.userMessage || err.error?.message || 'Failed to save subject.';
      },
    });
  }

  deleteSubject(id: string): void {
    if (confirm('Are you sure you want to delete this subject and all its topics?')) {
      this.subjectService.deleteSubject(id).subscribe({
        next: () => this.loadSubjects(),
        error: (err) => {
          this.planError = err.userMessage || err.error?.message || 'Failed to delete subject.';
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
      },
      error: (err) => {
        this.topicModalError = err.userMessage || err.error?.message || 'Failed to add topic.';
      },
    });
  }

  deleteTopic(topicId: string): void {
    this.subjectService.deleteTopic(topicId).subscribe({
      next: () => this.loadSubjects(),
      error: (err) => {
        this.planError = err.userMessage || err.error?.message || 'Failed to delete topic.';
      },
    });
  }

  onGeneratePlan(): void {
    this.generatingPlan = true;
    this.planError = '';

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

  onPdfFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
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
    if (!this.activeSubjectForPdf || !this.pdfFile) return;

    this.pdfExtracting = true;
    this.pdfModalError = '';
    this.pdfWarning = '';

    this.subjectService.extractSyllabusPdf(this.activeSubjectForPdf._id, this.pdfFile).subscribe({
      next: (res) => {
        this.pdfExtracting = false;
        this.pdfSource = res.source;
        this.pdfWarning = res.warning || '';

        const existingSet = new Set((res.existingTopicTitles || []).map((t: string) => t.toLowerCase()));

        this.extractedUnits = (res.units || []).map((unit) => ({
          unitName: unit.unitName || 'Curriculum Topics',
          topics: (unit.topics || []).map((topic) => {
            const isDup = existingSet.has(topic.title.trim().toLowerCase());
            return {
              title: topic.title,
              estimatedHours: topic.estimatedHours || 2,
              difficulty: topic.difficulty || 3,
              selected: !isDup,
              isDuplicate: isDup,
            };
          }),
        }));

        this.pdfModalStep = 'review';
      },
      error: (err) => {
        this.pdfExtracting = false;
        this.pdfModalError =
          err.error?.message || err.userMessage || 'Failed to extract topics from PDF. Please check the document format.';
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
    if (!this.activeSubjectForPdf) return;

    const selectedTopics: Array<{ title: string; estimatedHours: number; difficulty: number; confidenceLevel: number }> = [];

    for (const unit of this.extractedUnits) {
      for (const t of unit.topics) {
        if (t.selected && t.title.trim().length >= 2) {
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

    this.subjectService.importTopics(this.activeSubjectForPdf._id, selectedTopics).subscribe({
      next: (res) => {
        this.pdfImporting = false;
        this.showPdfModal = false;
        this.successBanner = `🎉 Successfully imported ${res.count} topics into ${this.activeSubjectForPdf?.name}!`;
        setTimeout(() => (this.successBanner = ''), 6000);
        this.loadSubjects();
      },
      error: (err) => {
        this.pdfImporting = false;
        this.pdfModalError = err.error?.message || err.userMessage || 'Failed to import topics. Please try again.';
      },
    });
  }
}
