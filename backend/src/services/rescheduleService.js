const Session = require('../models/Session');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');

/**
 * Adaptive Rescheduling Algorithm
 * Intelligently reallocates missed/partially completed study time
 * without naive domino delays or violating daily study workload limits.
 */
const recalculateMissedSession = async (userId, sessionId, actualMinutes = 0) => {
  const missedSession = await Session.findOne({ _id: sessionId, userId })
    .populate('subjectId')
    .populate('topicId');

  if (!missedSession) {
    throw new Error('Study session not found.');
  }

  const plannedMinutes = missedSession.durationMinutes || 50;
  const minutesStudied = Math.max(0, Math.min(plannedMinutes, Number(actualMinutes) || 0));
  const unfinishedMinutes = Math.max(0, plannedMinutes - minutesStudied);

  // Credit any completed minutes directly to the topic
  if (missedSession.topicId && minutesStudied > 0) {
    const topic = await Topic.findOne({ _id: missedSession.topicId._id, userId });
    if (topic) {
      const addedHours = parseFloat((minutesStudied / 60).toFixed(2));
      topic.completedHours = parseFloat(((topic.completedHours || 0) + addedHours).toFixed(2));
      topic.lastStudiedAt = new Date();
      if (topic.completedHours >= topic.estimatedHours) {
        topic.status = 'COMPLETED';
      } else {
        topic.status = 'IN_PROGRESS';
      }
      await topic.save();
    }
  }

  // 1. If session was fully completed
  if (unfinishedMinutes === 0) {
    missedSession.status = 'COMPLETED';
    missedSession.actualMinutesSpent = plannedMinutes;
    missedSession.completedAt = new Date();
    await missedSession.save();
    return {
      strategy: 'COMPLETED_ON_TIME',
      explanation: 'Session completed successfully. Topic progress recorded.',
      adjustedSessions: [missedSession],
    };
  }

  // 2. Mark session status as PARTIALLY_COMPLETED or MISSED
  missedSession.status = minutesStudied > 0 ? 'PARTIALLY_COMPLETED' : 'MISSED';
  missedSession.actualMinutesSpent = minutesStudied;
  missedSession.completedAt = new Date();
  await missedSession.save();

  // If this was an unassigned buffer session, no topic backlog exists
  if (!missedSession.topicId) {
    return {
      strategy: 'BUFFER_SKIPPED',
      explanation: 'Buffer session skipped. Your core study plan remains intact.',
      adjustedSessions: [missedSession],
    };
  }

  const subjectExamDate = missedSession.subjectId?.examDate
    ? new Date(missedSession.subjectId.examDate)
    : null;

  // Find future scheduled sessions
  const futureSessions = await Session.find({
    userId,
    date: { $gte: missedSession.date },
    status: 'SCHEDULED',
    _id: { $ne: missedSession._id },
  })
    .sort({ date: 1, startTime: 1 })
    .populate('subjectId')
    .populate('topicId');

  // Filter future sessions that occur before the subject exam date
  const futureSessionsBeforeExam = futureSessions.filter((s) => {
    const sessionDate = new Date(s.date);
    return !subjectExamDate || sessionDate <= subjectExamDate;
  });

  // Scenario: Missed session immediately before exam with no future slots before exam date
  if (!futureSessionsBeforeExam.length) {
    return {
      strategy: 'IMMINENT_EXAM_STRATEGY',
      explanation: `Your ${missedSession.subjectId?.name || 'subject'} exam is imminent and remaining slots before the exam date are full. Rather than adding extra pressure, we recommend a 20-minute active recall review of "${missedSession.topicId.title}" this evening.`,
      adjustedSessions: [missedSession],
    };
  }

  // Strategy 1: Buffer Slot Absorption
  // Find the first upcoming BUFFER session occurring before the subject's exam
  const bufferSlot = futureSessionsBeforeExam.find((s) => s.sessionType === 'BUFFER');

  if (bufferSlot) {
    bufferSlot.subjectId = missedSession.subjectId._id;
    bufferSlot.topicId = missedSession.topicId._id;
    bufferSlot.sessionType = 'LEARNING';
    const dateStr = bufferSlot.date.toISOString().split('T')[0];
    bufferSlot.notes = `[Adaptive] Absorbed ${unfinishedMinutes}m catch-up for ${missedSession.topicId.title}`;
    await bufferSlot.save();

    return {
      strategy: 'BUFFER_ABSORPTION',
      explanation: `Intelligently absorbed ${unfinishedMinutes} unfinished minutes into your scheduled buffer slot on ${dateStr} at ${bufferSlot.startTime}. No extra workload added!`,
      affectedSessionIds: [bufferSlot._id],
      adjustedSessions: [missedSession, bufferSlot],
    };
  }

  // Strategy 2: Low-Priority Topic Rebalancing / Compression
  // Find a future session studying a low-difficulty (<=2) or high-confidence (>=4) topic before exam
  const lowPrioritySlot = futureSessionsBeforeExam.find((s) => {
    return (
      s.sessionType === 'PRACTICE' ||
      (s.topicId &&
        (s.topicId.confidenceLevel >= 4 || s.topicId.difficulty <= 2))
    );
  });

  if (lowPrioritySlot) {
    const replacedTitle = lowPrioritySlot.topicId?.title || 'General Review';
    const dateStr = lowPrioritySlot.date.toISOString().split('T')[0];

    lowPrioritySlot.subjectId = missedSession.subjectId._id;
    lowPrioritySlot.topicId = missedSession.topicId._id;
    lowPrioritySlot.sessionType = 'LEARNING';
    lowPrioritySlot.notes = `[Urgency Rebalanced] Replaced review of "${replacedTitle}" with urgent topic "${missedSession.topicId.title}"`;
    await lowPrioritySlot.save();

    return {
      strategy: 'PRIORITY_REBALANCE',
      explanation: `Rebalanced schedule: Replaced a low-urgency review session on ${dateStr} with "${missedSession.topicId.title}" to protect your exam readiness.`,
      affectedSessionIds: [lowPrioritySlot._id],
      adjustedSessions: [missedSession, lowPrioritySlot],
    };
  }

  // Strategy 3: Next Available Slot Insertion Before Exam
  const nextSlot = futureSessionsBeforeExam[0];
  if (nextSlot) {
    const dateStr = nextSlot.date.toISOString().split('T')[0];
    nextSlot.subjectId = missedSession.subjectId._id;
    nextSlot.topicId = missedSession.topicId._id;
    nextSlot.sessionType = 'LEARNING';
    nextSlot.notes = `[Rescheduled] Moved urgent topic "${missedSession.topicId.title}" to next slot`;
    await nextSlot.save();

    return {
      strategy: 'NEXT_AVAILABLE_ALLOCATION',
      explanation: `Moved missed study session to your next upcoming slot on ${dateStr} at ${nextSlot.startTime}.`,
      affectedSessionIds: [nextSlot._id],
      adjustedSessions: [missedSession, nextSlot],
    };
  }

  return {
    strategy: 'MANUAL_ATTENTION_NEEDED',
    explanation: 'No open future study slots available before your exam date. Consider extending your daily available hours in settings.',
    adjustedSessions: [missedSession],
  };
};

module.exports = { recalculateMissedSession };
