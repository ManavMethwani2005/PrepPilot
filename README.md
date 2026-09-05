# PrepPilot

Your AI-powered study co-pilot.

An adaptive study planner that generates realistic, personalized study timetables based on exam deadlines, available hours, and topic difficulty, and dynamically rebalances sessions when life happens.

---

## Features

- **AI-Powered Study Planning**: Generates realistic, non-overlapping study timetables tailored to student daily availability and energy peaks.
- **Syllabus & Topic Management**: Organize subjects with exam dates, topic difficulty ratings (1–5), and confidence ratings (1–5).
- **PDF Syllabus Import**: Upload course syllabus PDFs to automatically extract units, chapters, and topics using Gemini AI or the resilient fallback parser.
- **Adaptive Rescheduling**: Dynamically absorbs missed or partially completed sessions into buffer slots without domino delays or pushing study past exam dates.
- **Exam Countdown**: Tracks upcoming exam deadlines with urgency weighting to prioritize critical topics first.
- **Daily Timetable**: Clear day-by-day and weekly calendar views showing structured Pomodoro blocks and designated breaks.
- **Pomodoro Focus Mode**: Integrated distraction-free study timer with play, pause, reset, and topic-specific technique recommendations.
- **Gemini-Powered Study Guidance**: Contextual study advice, memory techniques (active recall, Feynman technique), and weekly strategic roadmaps.

---

## Tech Stack

- **Frontend**: Angular (v21 standalone components, reactive signals/services)
- **Styling**: HTML5 + Clean CSS Design System (Accessible, responsive 360px–1440px, dark/light theme tokens)
- **Backend**: Node.js + Express.js (REST API, CommonJS)
- **Database**: MongoDB Atlas / local MongoDB with Mongoose ODM
- **AI Integration**: Google Gemini API (`gemini-1.5-flash` with token-capped JSON schema mode and deterministic fallback)
- **Testing**: Automated test suites (64-case full E2E QA, 33-case syllabus suite, 20-case core engine suite) + Postman collection
- **Deployment Targets**: Vercel (Frontend) & Render (Backend)

---

## Architecture

```
Angular (Client SPA)
         ↓  HTTPS / REST (JSON) + JWT
Express.js API (Backend)
    ├── Auth & Rate Limiting Middleware
    ├── Deterministic Scheduling Engine
    ├── Adaptive Rescheduling Engine
    ├── Multer / PDF In-Memory Parser
    └── Gemini AI Integration Service
         ↓                         ↓
   MongoDB Atlas           Google Gemini API
(Persistent Storage)     (Server-Side AI Only)
```

- **Client Security**: Angular never communicates directly with MongoDB or Gemini. All requests flow through the Express API.
- **Secret Isolation**: `GEMINI_API_KEY`, `MONGO_URI`, and `JWT_SECRET` reside strictly on the backend server.
- **CORS Protection**: Origin-checked via configurable `CLIENT_URL` whitelist.

---

## Local Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB Atlas cluster or local MongoDB instance (`mongodb://127.0.0.1:27017/preppilot`)
- Google Gemini API Key (optional; runs on rule-based fallback if omitted)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Configure your `backend/.env` file:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key_optional
CLIENT_URL=http://localhost:4200
```

Start the backend server:
```bash
npm run dev
```
The backend will run on `http://localhost:5000`.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```
The Angular application will be available at `http://localhost:4200`.

---

## AI Architecture

PrepPilot separates **mathematical scheduling constraints** from **generative AI reasoning**:

1. **Deterministic Scheduling Engine (Hard Constraints)**:
   - **Daily Capacity**: Strict adherence to student's chosen study hours (e.g. 2–4 hours/day).
   - **Exam Deadlines**: Urgency weighting ($10 / \max(1, \text{DaysUntilExam})$) ensures topics are scheduled prior to exam dates.
   - **Priority & Gap Weighting**: Low confidence (rating 1) and high difficulty (rating 5) are prioritized first.
   - **Slot Collision Prevention**: Non-overlapping study slots (e.g. 50 min study + 10 min break).
   - **Buffer Preservation**: Automatically reserves catch-up slots for schedule absorption.

2. **Google Gemini API (Selective AI Layer)**:
   - Personalized study roadmap summaries and actionable technique tips.
   - Topic-specific advice (active recall prompts, mnemonics, chunking).
   - Structured JSON syllabus extraction from uploaded course PDFs.
   - **Resilience**: If the Gemini API key is not provided, rate limits are reached, or network errors occur, the backend automatically transitions to curated fallback templates and regex parsers without disrupting timetable creation.

---

## Adaptive Scheduling

Standard study calendars suffer from the **"domino delay"**: missing one session pushes all future sessions back, causing panic and collisions with fixed exam dates.

PrepPilot handles session outcomes intelligently:

- **Completed (`COMPLETED`)**: Full credit is applied to the topic's completed hours; study streak increments.
- **Partially Completed (`PARTIALLY_COMPLETED`)**: The student enters elapsed minutes (e.g. 20 of 50 minutes). The completed portion is credited to topic progress, and the unfinished delta ($\Delta = 30\text{ min}$) is absorbed into the next pre-allocated `BUFFER` slot before the exam.
- **Missed (`MISSED`)**: The unfinished slot is automatically re-queued and absorbed into buffer capacity without altering other days or increasing daily study hours beyond the student's capacity limit.

---

## Verification & Testing

### Automated Test Suites

Run the complete backend test suite:
```bash
cd backend
npm test
```
- **Engine Tests (`test-engine.js`)**: 20/20 tests passed (priority formulas, capacity limits, slot arithmetic).
- **Syllabus Tests (`test-syllabus.js`)**: 33/33 tests passed (PDF parsing, NLP/DBMS/DSA extraction, edge cases, deduplication).
- **End-to-End QA Suite (`test-full-qa.js`)**: 64/64 tests passed across all API routes and workflows.

### Angular Production Build
```bash
cd frontend
npm run build
```
Builds cleanly to `dist/frontend/browser` with 0 errors and 0 warnings.

---

## Production Deployment Readiness

### 1. MongoDB Atlas Network Access
Cloud platforms (such as Render) assign dynamic outbound IP addresses. In MongoDB Atlas:
1. Navigate to **Network Access** → **Add IP Address**.
2. Select **Allow Access from Anywhere** (`0.0.0.0/0`) and save.

### 2. Backend Deployment (Render)
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `PORT`: Automatically set by Render
  - `NODE_ENV`: `production`
  - `MONGO_URI`: Atlas connection string
  - `JWT_SECRET`: Random secure string
  - `GEMINI_API_KEY`: Server-side API key
  - `CLIENT_URL`: Deployed Vercel frontend URL (e.g. `https://your-preppilot.vercel.app`)

### 3. Frontend Deployment (Vercel)
- **Root Directory**: `frontend`
- **Framework Preset**: `Angular`
- **Build Command**: `npm run build`
- **Output Directory**: `dist/frontend/browser`
- **Configuration**: Production API URL is configured in `frontend/src/environments/environment.prod.ts`. SPA routing rewrites are defined in `frontend/vercel.json`.
