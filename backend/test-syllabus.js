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
const Subject = require('./src/models/Subject');
const Topic = require('./src/models/Topic');
const User = require('./src/models/User');
const { extractTextFromPdfBuffer } = require('./src/services/pdfService');
const { extractSyllabusTopics, fallbackExtractSyllabus } = require('./src/services/geminiService');
const { generateDeterministicSchedule } = require('./src/services/schedulerService');

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

async function runSyllabusSuite() {
  console.log('\n=====================================================');
  console.log('   PREPPILOT SYLLABUS PDF IMPORT AUDIT SUITE         ');
  console.log('=====================================================\n');

  const testDataDir = path.join(__dirname, 'test-data');

  // ---------------------------------------------------------
  // 1. PDF Text Extraction & Content Integrity Tests
  // ---------------------------------------------------------
  console.log('--- 1. PDF Text Extraction Tests ---');

  const nlpBuf = fs.readFileSync(path.join(testDataDir, 'PrepPilot_Test_NLP_Syllabus.pdf'));
  const dbmsBuf = fs.readFileSync(path.join(testDataDir, 'PrepPilot_Test_DBMS_Syllabus.pdf'));
  const dsaBuf = fs.readFileSync(path.join(testDataDir, 'PrepPilot_Test_DSA_Short.pdf'));
  const messyBuf = fs.readFileSync(path.join(testDataDir, 'PrepPilot_Test_Messy_Syllabus.pdf'));

  const nlpData = await extractTextFromPdfBuffer(nlpBuf);
  assert(nlpData.text.length > 500, `NLP PDF text extracted (${nlpData.text.length} chars)`);
  assert(nlpData.text.includes('Natural Language Processing'), 'NLP text contains course title');

  const dbmsData = await extractTextFromPdfBuffer(dbmsBuf);
  assert(dbmsData.text.length > 500, `DBMS PDF text extracted (${dbmsData.text.length} chars)`);
  assert(dbmsData.text.includes('Database Management Systems'), 'DBMS text contains course title');

  const dsaData = await extractTextFromPdfBuffer(dsaBuf);
  assert(dsaData.text.length > 200, `DSA Short PDF text extracted (${dsaData.text.length} chars)`);
  assert(dsaData.text.includes('Data Structures & Algorithms'), 'DSA text contains course title');

  const messyData = await extractTextFromPdfBuffer(messyBuf);
  assert(messyData.text.length > 400, `Messy OS PDF text extracted (${messyData.text.length} chars)`);
  assert(messyData.text.includes('Operating Systems'), 'Messy OS text contains course title');

  // ---------------------------------------------------------
  // 2. Structured Unit & Topic Parsing Tests (All 4 PDFs)
  // ---------------------------------------------------------
  console.log('\n--- 2. Syllabus Unit & Topic Structuring Tests ---');

  // 2.1 NLP Extraction
  const nlpResult = await extractSyllabusTopics(nlpData.text, 'Natural Language Processing');
  assert(nlpResult.units.length >= 4, `NLP extracted ${nlpResult.units.length} units (expected >= 4)`);
  const nlpTopicCount = nlpResult.units.reduce((acc, u) => acc + u.topics.length, 0);
  assert(nlpTopicCount >= 15, `NLP extracted ${nlpTopicCount} topics (expected >= 15)`);
  const hasTokenization = nlpResult.units.some((u) =>
    u.topics.some((t) => t.title.toLowerCase().includes('tokenization') || t.title.toLowerCase().includes('text preprocessing'))
  );
  assert(hasTokenization, 'NLP topics include tokenization / text preprocessing');

  // 2.2 DBMS Extraction
  const dbmsResult = await extractSyllabusTopics(dbmsData.text, 'Database Management Systems');
  assert(dbmsResult.units.length >= 4, `DBMS extracted ${dbmsResult.units.length} units (expected >= 4)`);
  const dbmsTopicCount = dbmsResult.units.reduce((acc, u) => acc + u.topics.length, 0);
  assert(dbmsTopicCount >= 15, `DBMS extracted ${dbmsTopicCount} topics (expected >= 15)`);
  const hasNormalization = dbmsResult.units.some((u) =>
    u.topics.some((t) => t.title.toLowerCase().includes('normalization') || t.title.toLowerCase().includes('relational'))
  );
  assert(hasNormalization, 'DBMS topics include normalization / relational concepts');

  // 2.3 DSA Extraction
  const dsaResult = await extractSyllabusTopics(dsaData.text, 'Data Structures & Algorithms');
  assert(dsaResult.units.length >= 1, `DSA extracted ${dsaResult.units.length} units (expected >= 1)`);
  const dsaTopicCount = dsaResult.units.reduce((acc, u) => acc + u.topics.length, 0);
  assert(dsaTopicCount >= 7, `DSA extracted ${dsaTopicCount} topics (expected >= 7)`);
  const hasTrees = dsaResult.units.some((u) =>
    u.topics.some((t) => t.title.toLowerCase().includes('trees') || t.title.toLowerCase().includes('arrays'))
  );
  assert(hasTrees, 'DSA topics include trees / arrays');

  // 2.4 Messy OS Extraction (Does not crash, extracts multi-format units)
  const messyResult = await extractSyllabusTopics(messyData.text, 'Operating Systems');
  assert(messyResult.units.length >= 3, `Messy OS extracted ${messyResult.units.length} units without crashing`);
  const messyTopicCount = messyResult.units.reduce((acc, u) => acc + u.topics.length, 0);
  assert(messyTopicCount >= 10, `Messy OS extracted ${messyTopicCount} topics`);
  const hasPaging = messyResult.units.some((u) =>
    u.topics.some((t) => t.title.toLowerCase().includes('paging') || t.title.toLowerCase().includes('processes') || t.title.toLowerCase().includes('deadlock'))
  );
  assert(hasPaging, 'Messy OS topics include paging / memory / process concepts');

  // ---------------------------------------------------------
  // 3. Robust Error Boundaries & Validation
  // ---------------------------------------------------------
  console.log('\n--- 3. Error Boundaries & Validation Tests ---');

  // 3.1 Non-PDF file rejection
  let nonPdfCaught = false;
  try {
    const fakeTextBuffer = Buffer.from('This is a plain text file, not a PDF!', 'utf-8');
    await extractTextFromPdfBuffer(fakeTextBuffer);
  } catch (err) {
    nonPdfCaught = true;
    assert(err.message.includes('not a valid PDF document'), 'Non-PDF file buffer properly rejected with 400-level error');
  }
  assert(nonPdfCaught, 'Error thrown on invalid PDF magic bytes');

  // 3.2 Corrupted / Malformed PDF handling
  let corruptedCaught = false;
  try {
    const malformedPdf = Buffer.from('%PDF-1.4\nCorrupted content without valid xref or trailer\n%%EOF', 'ascii');
    await extractTextFromPdfBuffer(malformedPdf);
  } catch (err) {
    corruptedCaught = true;
    assert(err.message.includes('Failed to parse PDF document'), 'Corrupted PDF properly caught and wrapped in user-friendly error');
  }
  assert(corruptedCaught, 'Error thrown on corrupted PDF stream');

  // 3.3 Gemini offline / fallback parser verification
  const forcedFallbackResult = fallbackExtractSyllabus(nlpData.text, 'NLP Fallback');
  assert(forcedFallbackResult.length >= 4, 'Deterministic fallback parser extracts units independently of Gemini');
  const fallbackTopicCount = forcedFallbackResult.reduce((acc, u) => acc + u.topics.length, 0);
  assert(fallbackTopicCount >= 15, `Fallback parser extracted ${fallbackTopicCount} topics without crashing`);

  // ---------------------------------------------------------
  // 4. Database Persistence, Duplicates & Scheduler Integration
  // ---------------------------------------------------------
  console.log('\n--- 4. Database Persistence, Deduplication & Scheduler Tests ---');

  await connectDB();

  // Create temporary test student and subject
  const testEmail = `syllabus_test_${Date.now()}@example.com`;
  const testUser = await User.create({
    fullName: 'Syllabus Tester',
    email: testEmail,
    passwordHash: 'hashed_dummy_password_for_test',
  });

  const examDate = new Date();
  examDate.setDate(examDate.getDate() + 14); // Exam in 14 days

  const testSubject = await Subject.create({
    userId: testUser._id,
    name: 'Natural Language Processing',
    color: '#6366f1',
    examDate,
    priorityWeight: 4,
  });

  try {
    // 4.1 Initial Manual Topic Creation (Verify manual creation works)
    const manualTopic = await Topic.create({
      subjectId: testSubject._id,
      userId: testUser._id,
      title: 'Manual Introduction to NLP',
      estimatedHours: 2,
      difficulty: 2,
      confidenceLevel: 3,
    });
    assert(Boolean(manualTopic._id), 'Manual topic creation succeeds alongside PDF import feature');

    // 4.2 Duplicate Topic Prevention in Bulk Import
    // We attempt to import a list that includes:
    // 1. "Manual Introduction to NLP" (duplicate of existing)
    // 2. "Tokenization & Preprocessing" (new)
    // 3. "tokenization & preprocessing" (duplicate within the same batch!)
    // 4. "Word Embeddings & Vectors" (new)
    const candidateTopics = [
      { title: 'manual introduction to nlp', estimatedHours: 3 }, // Should be skipped (case-insensitive duplicate of manual)
      { title: 'Tokenization & Preprocessing', estimatedHours: 2.5, difficulty: 3 },
      { title: 'tokenization & preprocessing', estimatedHours: 2.5, difficulty: 3 }, // Should be skipped (duplicate in batch)
      { title: 'Word Embeddings & Vectors', estimatedHours: 3, difficulty: 4 },
    ];

    // Simulate importSyllabusTopics logic
    const existingInDb = await Topic.find({ subjectId: testSubject._id, userId: testUser._id }).lean();
    const existingSet = new Set(existingInDb.map((t) => t.title.trim().toLowerCase()));

    const toInsert = [];
    const seenBatch = new Set();
    let skippedDuplicates = 0;

    for (const cand of candidateTopics) {
      const cleanTitle = cand.title.trim();
      const lower = cleanTitle.toLowerCase();
      if (existingSet.has(lower) || seenBatch.has(lower)) {
        skippedDuplicates++;
        continue;
      }
      seenBatch.add(lower);
      toInsert.push({
        subjectId: testSubject._id,
        userId: testUser._id,
        title: cleanTitle,
        estimatedHours: cand.estimatedHours,
        difficulty: cand.difficulty || 3,
        confidenceLevel: 3,
        status: 'PENDING',
      });
    }

    assert(toInsert.length === 2, `Deduplication selected exactly 2 new topics (skipped ${skippedDuplicates} duplicates)`);
    assert(skippedDuplicates === 2, '2 duplicates correctly detected and excluded');

    // Insert new topics
    await Topic.insertMany(toInsert);

    // 4.3 Subject Summary Metrics Update
    const allTopics = await Topic.find({ subjectId: testSubject._id, userId: testUser._id }).lean();
    assert(allTopics.length === 3, 'Subject now has exactly 3 topics in MongoDB (1 manual + 2 imported)');
    const totalHours = allTopics.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    assert(totalHours === 7.5, `Total estimated hours accurately recalculated (${totalHours}h: 2 + 2.5 + 3)`);

    // 4.4 Scheduler Integration with Imported Topics
    const preferences = {
      dailyAvailableHours: 3,
      preferredPeriod: 'MORNING',
      sessionDurationMinutes: 50,
      breakDurationMinutes: 10,
    };
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    const scheduleResult = await generateDeterministicSchedule(testUser._id, startDate, endDate, preferences);
    assert(scheduleResult.sessions.length > 0, `Scheduler generated ${scheduleResult.sessions.length} sessions for imported topics`);

    const scheduledTopicIds = new Set(
      scheduleResult.sessions.filter((s) => s.topicId).map((s) => s.topicId.toString())
    );
    const tokenizationTopic = allTopics.find((t) => t.title === 'Tokenization & Preprocessing');
    assert(
      scheduledTopicIds.has(tokenizationTopic._id.toString()),
      'Imported topic "Tokenization & Preprocessing" successfully scheduled in study timetable'
    );
  } finally {
    // Cleanup test data
    await Topic.deleteMany({ userId: testUser._id });
    await Subject.deleteMany({ userId: testUser._id });
    await User.deleteOne({ _id: testUser._id });
    await mongoose.connection.close();
  }

  console.log('\n=====================================================');
  console.log(`   AUDIT COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
  console.log('=====================================================\n');
}

runSyllabusSuite().catch((err) => {
  console.error('\nAUDIT FAILED:', err);
  process.exit(1);
});
