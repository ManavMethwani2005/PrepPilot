# PrepPilot

### Your AI-powered study co-pilot.

An adaptive study planner that generates realistic, personalized study timetables based on exam deadlines, available hours, topic difficulty, and student confidence — and dynamically rebalances sessions when life happens.

---

## 🌐 Links

- **Live Demo:** https://prep-pilot-brown.vercel.app/
- **GitHub Repository:** https://github.com/ManavMethwani2005/PrepPilot

---

## 💡 Why PrepPilot?

Traditional study timetables are often rigid: missing one session can shift everything that follows and make the entire plan unrealistic.

PrepPilot takes an adaptive approach. It combines deterministic scheduling constraints with AI-assisted personalization to create study plans that remain practical when a student falls behind, partially completes a session, or needs to adjust their preparation.

The goal is simple:

> **Your plan adapts to you.**

---

## ✨ Features

- **AI-Powered Study Planning**  
  Generates realistic, non-overlapping study timetables tailored to student availability, exam dates, preparation level, and energy preferences.

- **Syllabus & Topic Management**  
  Organize subjects with exam dates, topic difficulty ratings (1–5), confidence ratings (1–5), and topic-level preparation information.

- **PDF Syllabus Import**  
  Upload course syllabus PDFs to automatically extract units, chapters, and topics using Gemini AI or the resilient deterministic fallback parser.

- **Adaptive Rescheduling**  
  Dynamically absorbs missed or partially completed sessions into available buffer capacity without creating domino delays or pushing study beyond exam dates.

- **Exam Countdown**  
  Tracks upcoming exam deadlines and uses urgency weighting to prioritize critical topics as exams approach.

- **Daily & Weekly Timetable**  
  Clear day-by-day and weekly calendar views showing structured study sessions, Pomodoro blocks, and designated breaks.

- **Pomodoro Focus Mode**  
  Integrated distraction-free study timer with play, pause, reset, session completion tracking, and topic-specific study technique recommendations.

- **Gemini-Powered Study Guidance**  
  Provides contextual study advice, memory techniques such as active recall and the Feynman technique, and strategic study roadmaps.

- **Progress Tracking**  
  Tracks completed sessions, partial progress, remaining workload, and study progress.

- **Secure Authentication**  
  JWT-based authentication with protected application routes and backend-controlled credentials.

---

## 🛠️ Tech Stack

### Frontend

- Angular 21
- Standalone Components
- Reactive Signals / Services
- TypeScript
- HTML5
- CSS

### Backend

- Node.js
- Express.js
- REST API
- CommonJS

### Database

- MongoDB Atlas
- Mongoose ODM

### AI Integration

- Google Gemini API
- Structured JSON responses
- Deterministic fallback logic

### Testing & Development

- Automated backend test suites
- Full API / workflow QA
- Postman
- Git
- GitHub
- VS Code

### Deployment

- Vercel — Frontend
- Render — Backend
- MongoDB Atlas — Database

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │      Student        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Angular Client    │
                    │      SPA + UI       │
                    └──────────┬──────────┘
                               │
                       HTTPS / REST + JWT
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Express.js API    │
                    │      Backend        │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
      │    Auth &   │   │ Deterministic│   │  Adaptive   │
      │   Security  │   │  Scheduling  │   │ Rescheduling│
      └─────────────┘   │    Engine    │   │   Engine    │
                        └─────────────┘   └─────────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                                   │
             ▼                                   ▼
      ┌─────────────┐                     ┌─────────────┐
      │  MongoDB    │                     │   Google    │
      │    Atlas    │                     │   Gemini    │
      │             │                     │     API     │
      └─────────────┘                     └─────────────┘