const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (_) {}

const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const app = require('./src/app');
const User = require('./src/models/User');
const Subject = require('./src/models/Subject');
const Topic = require('./src/models/Topic');
const Session = require('./src/models/Session');
const StudyPlan = require('./src/models/StudyPlan');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runFullQA() {
  console.log('\n=====================================================');
  console.log('   PREPPILOT FULL END-TO-END QA & VERIFICATION       ');
  console.log('=====================================================\n');

  await connectDB();

  // Start HTTP test server on port 5055 to avoid port collision
  const TEST_PORT = 5055;
  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => resolve(s));
  });
  const BASE_URL = `http://localhost:${TEST_PORT}/api`;

  const testEmail = `qa_master_${Date.now()}@example.com`;
  let authToken = '';
  let testUserId = '';

  try {
    // =========================================================================
    // 1. AUTHENTICATION TESTING
    // =========================================================================
    console.log('--- 1. Authentication Testing ---');

    // 1.1 New User Registration
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'QA Verification Lead',
        email: testEmail,
        password: 'Password123!',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, `New user registration returned 201 Created (got ${regRes.status})`);
    assert(Boolean(regData.token), 'Registration returned valid JWT token');
    assert(!regData.user.passwordHash, 'Password hash is strictly excluded from registration response');
    assert(regData.user.fullName === 'QA Verification Lead', 'User profile returned matching full name');
    authToken = regData.token;
    testUserId = regData.user.id;

    // 1.2 Duplicate Email Registration Rejection
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Duplicate Tester',
        email: testEmail,
        password: 'Password123!',
      }),
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 400, 'Duplicate email registration rejected with 400 Bad Request');
    assert(dupData.message.includes('already exists'), `Clear duplicate message returned: "${dupData.message}"`);

    // 1.3 Invalid Email Format Rejection
    const badEmailRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Bad Email',
        email: 'invalid-email-address',
        password: 'Password123!',
      }),
    });
    const badEmailData = await badEmailRes.json();
    assert(badEmailRes.status === 400, 'Malformed email rejected with 400');
    assert(badEmailData.message.includes('valid email'), 'Clear message for invalid email format');

    // 1.4 Weak Password (< 6 chars) Rejection
    const weakPassRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Weak Pass',
        email: `weak_${Date.now()}@example.com`,
        password: '123',
      }),
    });
    const weakPassData = await weakPassRes.json();
    assert(weakPassRes.status === 400, 'Short password rejected with 400');
    assert(weakPassData.message.includes('at least 6 characters'), 'Clear password length requirement message');

    // 1.5 Login with Correct Credentials
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Login with correct credentials returned 200 OK');
    assert(Boolean(loginData.token), 'Login returned valid JWT token');
    assert(!loginData.user.passwordHash, 'Password hash is strictly excluded from login response');

    // 1.6 Login with Incorrect Credentials
    const badPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword!',
      }),
    });
    assert(badPassRes.status === 401, 'Incorrect password rejected with 401 Unauthorized');

    // 1.7 Protected Route Access Without Token
    const unauthRes = await fetch(`${BASE_URL}/auth/me`);
    assert(unauthRes.status === 401, 'Protected route without token rejected with 401');

    // 1.8 Protected Route Access With Malformed/Expired Token
    const badTokenRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer this_is_an_invalid_garbage_token' },
    });
    assert(badTokenRes.status === 401, 'Protected route with invalid token rejected with 401');

    // 1.9 Token Persistence (Valid Token Access)
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'Protected profile fetch with valid token returned 200');
    assert(meData.user.email === testEmail, 'Authenticated user profile matches registered email');

    // =========================================================================
    // 2. EXAM & PREFERENCES MANAGEMENT
    // =========================================================================
    console.log('\n--- 2. Preferences & Settings Testing ---');

    // 2.1 Update study capacity, periods, and Pomodoro presets
    const prefRes = await fetch(`${BASE_URL}/auth/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        dailyAvailableHours: 3.5,
        preferredPeriod: 'MORNING',
        energyPeakTime: 'EARLY_DAY',
        sessionDurationMinutes: 50,
        breakDurationMinutes: 10,
      }),
    });
    const prefData = await prefRes.json();
    assert(prefRes.status === 200, 'Preferences updated successfully (200 OK)');
    assert(prefData.preferences.dailyAvailableHours === 3.5, 'Daily study capacity saved accurately (3.5h)');
    assert(prefData.preferences.preferredPeriod === 'MORNING', 'Preferred study period set to MORNING');

    // 2.2 Reject invalid dailyAvailableHours (> 14h)
    const badPrefRes = await fetch(`${BASE_URL}/auth/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ dailyAvailableHours: 24 }),
    });
    assert(badPrefRes.status === 400, 'Unrealistic daily capacity (24h) rejected with 400');

    // =========================================================================
    // 3. SUBJECT & TOPIC MANAGEMENT
    // =========================================================================
    console.log('\n--- 3. Subject & Topic Management Testing ---');

    // 3.1 Past Exam Date Validation (Must be future)
    const pastExamDate = new Date();
    pastExamDate.setDate(pastExamDate.getDate() - 1);
    const pastSubjectRes = await fetch(`${BASE_URL}/subjects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Past Subject',
        examDate: pastExamDate.toISOString(),
      }),
    });
    assert(pastSubjectRes.status === 400, 'Past exam date rejected with 400 Bad Request');

    // 3.2 Create Realistic Subjects: NLP, DBMS, DSA
    const nlpExam = new Date();
    nlpExam.setDate(nlpExam.getDate() + 10);
    const nlpSubRes = await fetch(`${BASE_URL}/subjects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Natural Language Processing',
        examDate: nlpExam.toISOString(),
        priorityWeight: 4,
        color: '#6366f1',
      }),
    });
    const nlpSubject = (await nlpSubRes.json()).data;
    assert(nlpSubRes.status === 201, 'Created subject "Natural Language Processing" (Exam in 10 days, Weight 4)');

    const dbmsExam = new Date();
    dbmsExam.setDate(dbmsExam.getDate() + 5); // Highest urgency!
    const dbmsSubRes = await fetch(`${BASE_URL}/subjects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Database Management Systems',
        examDate: dbmsExam.toISOString(),
        priorityWeight: 5,
        color: '#0ea5e9',
      }),
    });
    const dbmsSubject = (await dbmsSubRes.json()).data;
    assert(dbmsSubRes.status === 201, 'Created subject "Database Management Systems" (Exam in 5 days, Weight 5)');

    const dsaExam = new Date();
    dsaExam.setDate(dsaExam.getDate() + 20); // Lowest urgency
    const dsaSubRes = await fetch(`${BASE_URL}/subjects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Data Structures & Algorithms',
        examDate: dsaExam.toISOString(),
        priorityWeight: 3,
        color: '#10b981',
      }),
    });
    const dsaSubject = (await dsaSubRes.json()).data;
    assert(dsaSubRes.status === 201, 'Created subject "Data Structures & Algorithms" (Exam in 20 days, Weight 3)');

    // 3.3 Duplicate Subject Name Rejection
    const dupSubRes = await fetch(`${BASE_URL}/subjects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'natural language processing', // Case-insensitive duplicate
        examDate: nlpExam.toISOString(),
      }),
    });
    assert(dupSubRes.status === 400, 'Case-insensitive duplicate subject rejected with 400');

    // 3.4 Manual Topic Creation
    const manualTopicRes = await fetch(`${BASE_URL}/subjects/${nlpSubject._id}/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: 'Manual Text Processing Basics',
        estimatedHours: 2.0,
        difficulty: 2,
        confidenceLevel: 3,
      }),
    });
    const manualTopic = (await manualTopicRes.json()).data;
    assert(manualTopicRes.status === 201, 'Manual topic created successfully under NLP subject');

    // 3.5 Duplicate Topic In Same Subject Rejection
    const dupTopicRes = await fetch(`${BASE_URL}/subjects/${nlpSubject._id}/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: 'manual text processing basics', // Duplicate
        estimatedHours: 2.0,
      }),
    });
    assert(dupTopicRes.status === 400, 'Duplicate topic title in same subject rejected with 400');

    // =========================================================================
    // 4. PDF SYLLABUS IMPORT & BULK IMPORT
    // =========================================================================
    console.log('\n--- 4. PDF Syllabus Import & Deduplication ---');

    // 4.1 Bulk Import to DBMS
    const dbmsImportRes = await fetch(`${BASE_URL}/subjects/${dbmsSubject._id}/syllabus/import-topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        topics: [
          { title: 'Relational Algebra & Calculus', estimatedHours: 2.5, difficulty: 4, confidenceLevel: 2 },
          { title: 'SQL Queries, Joins & Subqueries', estimatedHours: 2.0, difficulty: 3, confidenceLevel: 3 },
          { title: 'Normalization (1NF, 2NF, 3NF, BCNF)', estimatedHours: 3.0, difficulty: 5, confidenceLevel: 1 },
          { title: 'Transaction Concurrency & ACID', estimatedHours: 2.5, difficulty: 4, confidenceLevel: 2 },
        ],
      }),
    });
    const dbmsImportData = await dbmsImportRes.json();
    assert(dbmsImportRes.status === 201, 'Bulk imported 4 topics into DBMS');
    assert(dbmsImportData.count === 4, '4 topics inserted into DBMS');

    // 4.2 Bulk Import to DSA
    const dsaImportRes = await fetch(`${BASE_URL}/subjects/${dsaSubject._id}/syllabus/import-topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        topics: [
          { title: 'Arrays & Linked Lists Implementation', estimatedHours: 1.5, difficulty: 2, confidenceLevel: 4 },
          { title: 'Binary Search Trees & Traversals', estimatedHours: 2.5, difficulty: 3, confidenceLevel: 3 },
          { title: 'Graph Traversal (BFS & DFS)', estimatedHours: 3.0, difficulty: 4, confidenceLevel: 2 },
        ],
      }),
    });
    assert(dsaImportRes.status === 201, 'Bulk imported 3 topics into DSA');

    // 4.3 Bulk Import to NLP with Deduplication
    const nlpImportRes = await fetch(`${BASE_URL}/subjects/${nlpSubject._id}/syllabus/import-topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        topics: [
          { title: 'Manual Text Processing Basics', estimatedHours: 2 }, // DUPLICATE of manualTopic!
          { title: 'Tokenization & Normalization Pipeline', estimatedHours: 2.0, difficulty: 2, confidenceLevel: 3 },
          { title: 'TF-IDF & Vector Space Models', estimatedHours: 2.5, difficulty: 3, confidenceLevel: 2 },
          { title: 'Word Embeddings & Word2Vec', estimatedHours: 3.0, difficulty: 4, confidenceLevel: 1 },
        ],
      }),
    });
    const nlpImportData = await nlpImportRes.json();
    assert(nlpImportData.count === 3, 'Imported 3 new topics to NLP');
    assert(nlpImportData.skippedDuplicates === 1, 'Correctly detected and skipped 1 existing duplicate');

    // 4.4 Verify Metric Recalculation (Topic Count, Total Hours, Progress)
    const allSubsRes = await fetch(`${BASE_URL}/subjects`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const allSubsData = await allSubsRes.json();
    const fetchedNlp = allSubsData.data.find((s) => s._id === nlpSubject._id);
    assert(fetchedNlp.totalTopics === 4, `NLP has 4 topics (1 manual + 3 imported). Got: ${fetchedNlp.totalTopics}`);
    assert(fetchedNlp.totalHours === 9.5, `NLP total hours recalculated accurately (9.5h). Got: ${fetchedNlp.totalHours}`);
    assert(fetchedNlp.progressPercent === 0, 'Initial progress is 0%');

    // =========================================================================
    // 5. STUDY PLAN GENERATION (DETERMINISTIC SCHEDULER)
    // =========================================================================
    console.log('\n--- 5. Deterministic Study Plan Generation ---');

    const planGenRes = await fetch(`${BASE_URL}/plans/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const planGenData = await planGenRes.json();
    assert(planGenRes.status === 201, 'Study plan generated successfully (201 Created)');
    assert(Boolean(planGenData.data?.plan), 'Generated plan returned in data.plan');

    // Fetch generated sessions from /api/sessions
    const sessionsRes = await fetch(`${BASE_URL}/sessions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const sessionsData = await sessionsRes.json();
    const sessions = sessionsData.data;
    assert(sessions.length > 0, `Fetched ${sessions.length} study sessions from database`);

    // 5.1 Verify Non-Overlapping Sessions
    // Group sessions by date and check that slot end time <= next slot start time
    const sessionsByDate = new Map();
    sessions.forEach((s) => {
      const d = s.date.split('T')[0];
      if (!sessionsByDate.has(d)) sessionsByDate.set(d, []);
      sessionsByDate.get(d).push(s);
    });

    let overlapFound = false;
    for (const [dateStr, daySessions] of sessionsByDate.entries()) {
      daySessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < daySessions.length - 1; i++) {
        const cur = daySessions[i];
        const nxt = daySessions[i + 1];
        if (cur.endTime > nxt.startTime) {
          overlapFound = true;
          console.error(`Overlap on ${dateStr}: ${cur.startTime}-${cur.endTime} overlaps ${nxt.startTime}-${nxt.endTime}`);
        }
      }
    }
    assert(!overlapFound, 'Zero overlapping sessions generated across the entire study schedule');

    // 5.2 Verify Daily Capacity Constraint (<= 3.5 hours = 210 mins)
    const maxDailyLimitMinutes = 3.5 * 60;
    let capacityViolated = false;
    for (const [dateStr, daySessions] of sessionsByDate.entries()) {
      const totalMinutes = daySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
      if (totalMinutes > maxDailyLimitMinutes) {
        capacityViolated = true;
        console.error(`Capacity violated on ${dateStr}: ${totalMinutes}m > ${maxDailyLimitMinutes}m limit`);
      }
    }
    assert(!capacityViolated, 'Daily study limit strictly respected (<= 3.5h / day)');

    // 5.3 Verify Exam Urgency Priority
    // DBMS has exam in 5 days (earliest), so DBMS sessions should be heavily prioritized early
    const firstDayDate = Array.from(sessionsByDate.keys())[0];
    const firstDaySessions = sessionsByDate.get(firstDayDate);
    const dbmsSessionFirstDay = firstDaySessions.find(
      (s) => s.subjectId?.name === 'Database Management Systems' || s.subjectId === dbmsSubject._id
    );
    assert(Boolean(dbmsSessionFirstDay), 'Highest-urgency subject (DBMS, 5 days to exam) scheduled on Day 1');

    // 5.4 Verify Buffer/Catch-Up Sessions exist
    const bufferSessions = sessions.filter((s) => s.sessionType === 'BUFFER');
    assert(bufferSessions.length > 0, `Schedule contains ${bufferSessions.length} buffer catch-up slots`);

    // =========================================================================
    // 6. ADAPTIVE RESCHEDULING
    // =========================================================================
    console.log('\n--- 6. Adaptive Rescheduling Testing ---');

    // Pick an active learning session from the generated plan
    const learningSession = sessions.find((s) => s.sessionType === 'LEARNING' && s.topicId);
    assert(Boolean(learningSession), 'Found learning session to test status updates');

    // 6.1 Mark Session COMPLETED
    const doneRes = await fetch(`${BASE_URL}/sessions/${learningSession._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        status: 'COMPLETED',
        actualMinutesSpent: 50,
      }),
    });
    const doneData = await doneRes.json();
    assert(doneRes.status === 200, 'Marked session COMPLETED (200 OK)');
    assert(doneData.requiresReschedule === false, 'Completed session does not trigger rescheduling');

    // Verify topic progress updated in DB
    const topicAfterDone = await Topic.findById(learningSession.topicId._id || learningSession.topicId);
    assert(topicAfterDone.completedHours >= 0.8, `Topic progress credited (${topicAfterDone.completedHours}h completed)`);

    // 6.2 Mark Another Session PARTIALLY_COMPLETED (studied 20m of 50m)
    const secondSession = sessions.find(
      (s) => s.sessionType === 'LEARNING' && s.topicId && s._id !== learningSession._id
    );
    const partialRes = await fetch(`${BASE_URL}/sessions/${secondSession._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        status: 'PARTIALLY_COMPLETED',
        actualMinutesSpent: 20,
      }),
    });
    const partialData = await partialRes.json();
    assert(partialRes.status === 200, 'Marked session PARTIALLY_COMPLETED');
    assert(partialData.requiresReschedule === true, 'Partial session signals requiresReschedule = true');

    // 6.3 Trigger Adaptive Rescheduling via Recalculate Endpoint
    const rescheduleRes = await fetch(`${BASE_URL}/reschedule/recalculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        sessionId: secondSession._id,
        actualMinutes: 20,
      }),
    });
    const rescheduleData = await rescheduleRes.json();
    assert(rescheduleRes.status === 200, 'Adaptive rescheduling executed successfully (200 OK)');
    assert(
      ['BUFFER_ABSORPTION', 'PRIORITY_REBALANCE', 'IMMINENT_EXAM_STRATEGY'].includes(rescheduleData.data.strategy),
      `Rescheduling strategy assigned cleanly: ${rescheduleData.data.strategy}`
    );
    assert(Boolean(rescheduleData.data.explanation), `Clear explanation provided: "${rescheduleData.data.explanation}"`);

    // 6.4 Mark a Session MISSED
    const thirdSession = sessions.find(
      (s) => s.sessionType === 'LEARNING' && s.topicId && s._id !== learningSession._id && s._id !== secondSession._id
    );
    if (thirdSession) {
      const missedRes = await fetch(`${BASE_URL}/reschedule/recalculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sessionId: thirdSession._id,
          actualMinutes: 0,
        }),
      });
      assert(missedRes.status === 200, 'Missed session rescheduled without crashing');
    }

    // =========================================================================
    // 7. GEMINI TOPIC ADVICE ON-DEMAND
    // =========================================================================
    console.log('\n--- 7. Gemini Integration & Topic Advice ---');
    const topicTipRes = await fetch(`${BASE_URL}/reschedule/topic-tip/${learningSession.topicId._id || learningSession.topicId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const topicTipData = await topicTipRes.json();
    assert(topicTipRes.status === 200, 'On-demand topic advice endpoint returns 200 OK');
    assert(Boolean(topicTipData.tip), `Actionable technique returned: "${topicTipData.tip}"`);

    // =========================================================================
    // 8. DASHBOARD & STATS PERSISTENCE
    // =========================================================================
    console.log('\n--- 8. Dashboard Analytics & Statistics ---');
    const statsRes = await fetch(`${BASE_URL}/plans/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const statsData = await statsRes.json();
    assert(statsRes.status === 200, 'Plan statistics endpoint returns 200 OK');
    assert(statsData.data.completedSessions >= 1, `Completed sessions tracked (${statsData.data.completedSessions})`);
    assert(statsData.data.totalSessions > 0, `Total sessions tracked (${statsData.data.totalSessions})`);

    const activePlanRes = await fetch(`${BASE_URL}/plans/active`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const activePlanData = await activePlanRes.json();
    assert(activePlanRes.status === 200, 'Active plan persists across requests (200 OK)');
    assert(activePlanData.data.userId.toString() === testUserId.toString(), 'Active plan belongs to logged-in user');

    // =========================================================================
    // 9. HEALTH CHECK VERIFICATION
    // =========================================================================
    console.log('\n--- 9. Health & Service Integrity ---');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'GET /api/health returns 200 OK');
    assert(healthData.status === 'ok', 'Health status is "ok"');
    assert(healthData.service === 'PrepPilot Backend', 'Service name is "PrepPilot Backend"');

    console.log('\n=====================================================');
    console.log(`   FULL QA SUITE: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
    console.log('=====================================================\n');
  } finally {
    // Clean up QA test user data
    if (testUserId) {
      await Session.deleteMany({ userId: testUserId });
      await Topic.deleteMany({ userId: testUserId });
      await Subject.deleteMany({ userId: testUserId });
      await StudyPlan.deleteMany({ userId: testUserId });
      await User.deleteOne({ _id: testUserId });
      console.log('✓ Cleaned up test student records and fixtures from MongoDB Atlas.');
    }
    server.close();
    await mongoose.connection.close();
  }
}

runFullQA().catch((err) => {
  console.error('\nQA SUITE FAILED:', err);
  process.exit(1);
});
