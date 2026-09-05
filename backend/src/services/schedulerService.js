const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const { calculateTopicPriority } = require('../utils/priorityCalculator');
const { addMinutesToTime, getDayRange, getStartTimeForPeriod, formatDate } = require('../utils/dateUtils');

/**
 * Deterministic scheduling algorithm:
 * Allocates topic study sessions into daily time slots based on:
 * - Urgency, difficulty, confidence gap, and subject priority
 * - User daily available hours and Pomodoro preferences
 * - Exam deadlines (never schedules a topic after its subject's exam)
 * - Spaced revision placement and buffer/catch-up slots
 * - Strict non-overlapping guarantees and daily capacity enforcement
 */
const generateDeterministicSchedule = async (userId, startDate, endDate, preferences) => {
  // 1. Fetch subjects and topics for this user
  const subjects = await Subject.find({ userId }).lean();
  if (!subjects.length) {
    throw new Error('No subjects found. Please add at least one subject with an upcoming exam date.');
  }

  const subjectMap = new Map();
  subjects.forEach((sub) => {
    subjectMap.set(sub._id.toString(), sub);
  });

  const topics = await Topic.find({
    userId,
    status: { $in: ['PENDING', 'IN_PROGRESS'] },
  }).lean();

  // Filter out any orphaned topics without a valid subject
  const validTopics = topics.filter((t) => subjectMap.has(t.subjectId.toString()));

  if (!validTopics.length) {
    throw new Error('No pending topics found. Please add topics to your subjects.');
  }

  // 2. Determine slot parameters from user preferences
  const dailyAvailableHours = Math.max(0.5, preferences?.dailyAvailableHours || 3);
  const dailyLimitMinutes = Math.round(dailyAvailableHours * 60);

  // Preferred session duration (e.g. 50 mins) clamped so it never exceeds dailyLimitMinutes
  const preferredSessionDuration = preferences?.sessionDurationMinutes || 50;
  const sessionDuration = Math.min(preferredSessionDuration, dailyLimitMinutes);

  // Break duration: only if daily limit allows for another session after break
  const preferredBreak = preferences?.breakDurationMinutes || 10;
  const breakDuration = dailyLimitMinutes >= sessionDuration * 2 + preferredBreak ? preferredBreak : 0;

  // Calculate slots that fit strictly within dailyLimitMinutes
  let testMinutes = 0;
  let computedSlots = 0;
  while (testMinutes + sessionDuration <= dailyLimitMinutes) {
    computedSlots++;
    testMinutes += sessionDuration + breakDuration;
  }
  const maxDailySlots = Math.max(1, computedSlots);

  const baseStartTime = getStartTimeForPeriod(preferences?.preferredPeriod || 'MORNING');
  const energyPeak = preferences?.energyPeakTime || 'EARLY_DAY';

  // 3. Prepare topic working queue with remaining hours and priority scores
  const topicQueue = validTopics.map((t) => {
    const sub = subjectMap.get(t.subjectId.toString());
    const remainingHours = Math.max(0.5, t.estimatedHours - (t.completedHours || 0));
    const { priorityScore, daysUntilExam } = calculateTopicPriority(t, sub, startDate);

    return {
      ...t,
      subject: sub,
      remainingHours,
      priorityScore,
      daysUntilExam,
      examDate: new Date(sub.examDate),
      sessionsNeeded: Math.ceil((remainingHours * 60) / sessionDuration),
      allocatedSessions: 0,
    };
  });

  // Sort queue deterministically:
  // Primary: Priority score descending
  // Secondary: Exam date ascending (closer exam first)
  // Tertiary: Difficulty descending
  // Quaternary: Title alphabetical for stable ordering
  topicQueue.sort((a, b) => {
    if (Math.abs(b.priorityScore - a.priorityScore) > 0.001) {
      return b.priorityScore - a.priorityScore;
    }
    if (a.examDate.getTime() !== b.examDate.getTime()) {
      return a.examDate.getTime() - b.examDate.getTime();
    }
    if (b.difficulty !== a.difficulty) {
      return b.difficulty - a.difficulty;
    }
    return a.title.localeCompare(b.title);
  });

  // 4. Generate day-by-day slot allocations
  const days = getDayRange(startDate, endDate);
  const plannedSessions = [];
  const completedTopicIdsForRevision = new Set();

  days.forEach((day, dayIndex) => {
    let currentTime = baseStartTime;
    const dayDateStr = formatDate(day);
    const dayObj = new Date(dayDateStr);
    let dailyMinutesAllocated = 0;

    for (let slotIndex = 0; slotIndex < maxDailySlots; slotIndex++) {
      // Strict Workload Cap: Stop if adding another session would exceed daily available limit
      if (dailyMinutesAllocated + sessionDuration > dailyLimitMinutes) {
        break;
      }

      const slotStartTime = currentTime;
      const slotEndTime = addMinutesToTime(slotStartTime, sessionDuration);
      currentTime = addMinutesToTime(slotEndTime, breakDuration);
      dailyMinutesAllocated += sessionDuration;

      // Strategy: Every 4th day's last slot is a BUFFER slot for catch-up/rescheduling
      // (Only insert buffer if student has at least 2 daily slots)
      const isBufferSlot = maxDailySlots > 1 && (dayIndex + 1) % 4 === 0 && slotIndex === maxDailySlots - 1;

      if (isBufferSlot) {
        plannedSessions.push({
          userId,
          subjectId: null,
          topicId: null,
          date: dayObj,
          startTime: slotStartTime,
          endTime: slotEndTime,
          durationMinutes: sessionDuration,
          sessionType: 'BUFFER',
          status: 'SCHEDULED',
          notes: 'Buffer & catch-up slot for flexible rescheduling',
        });
        continue;
      }

      // Check if any finished topic qualifies for spaced revision
      let revisionCandidate = null;
      if (completedTopicIdsForRevision.size > 0 && slotIndex === 0) {
        for (const revTopicId of completedTopicIdsForRevision) {
          const cand = topicQueue.find((t) => t._id.toString() === revTopicId);
          if (cand && dayObj < cand.examDate) {
            revisionCandidate = cand;
            completedTopicIdsForRevision.delete(revTopicId);
            break;
          }
        }
      }

      if (revisionCandidate) {
        plannedSessions.push({
          userId,
          subjectId: revisionCandidate.subjectId,
          topicId: revisionCandidate._id,
          date: dayObj,
          startTime: slotStartTime,
          endTime: slotEndTime,
          durationMinutes: sessionDuration,
          sessionType: 'REVISION',
          status: 'SCHEDULED',
          notes: `Spaced revision for ${revisionCandidate.title}`,
        });
        continue;
      }

      // Candidate Selection with Energy Peak alignment:
      // If EARLY_DAY: slotIndex 0 takes highest priority in queue
      // If LATE_DAY: slotIndex (maxDailySlots-1) takes highest priority; earlier slots take practice/review
      let validCandidateIndex = -1;

      if (energyPeak === 'LATE_DAY' && maxDailySlots > 1 && slotIndex < maxDailySlots - 1) {
        // Look for moderate priority topic first
        validCandidateIndex = topicQueue.findIndex(
          (t, idx) => idx > 0 && t.allocatedSessions < t.sessionsNeeded && dayObj <= t.examDate
        );
      }

      if (validCandidateIndex === -1) {
        validCandidateIndex = topicQueue.findIndex(
          (t) => t.allocatedSessions < t.sessionsNeeded && dayObj <= t.examDate
        );
      }

      if (validCandidateIndex !== -1) {
        const candidate = topicQueue[validCandidateIndex];
        candidate.allocatedSessions += 1;

        plannedSessions.push({
          userId,
          subjectId: candidate.subjectId,
          topicId: candidate._id,
          date: dayObj,
          startTime: slotStartTime,
          endTime: slotEndTime,
          durationMinutes: sessionDuration,
          sessionType: 'LEARNING',
          status: 'SCHEDULED',
          notes: `Session for ${candidate.title} (${candidate.subject.name})`,
        });

        // Queue for spaced revision once all study blocks are allocated
        if (candidate.allocatedSessions >= candidate.sessionsNeeded) {
          completedTopicIdsForRevision.add(candidate._id.toString());
        }
      } else {
        // If all urgent topics before exam are covered, allocate practice or buffer
        const anyFutureCandidate = topicQueue.find((t) => dayObj <= t.examDate);
        if (anyFutureCandidate) {
          plannedSessions.push({
            userId,
            subjectId: anyFutureCandidate.subjectId,
            topicId: anyFutureCandidate._id,
            date: dayObj,
            startTime: slotStartTime,
            endTime: slotEndTime,
            durationMinutes: sessionDuration,
            sessionType: 'PRACTICE',
            status: 'SCHEDULED',
            notes: `Reinforcement practice for ${anyFutureCandidate.title}`,
          });
        } else {
          plannedSessions.push({
            userId,
            subjectId: null,
            topicId: null,
            date: dayObj,
            startTime: slotStartTime,
            endTime: slotEndTime,
            durationMinutes: sessionDuration,
            sessionType: 'BUFFER',
            status: 'SCHEDULED',
            notes: 'Open review & rest period',
          });
        }
      }
    }
  });

  return {
    sessions: plannedSessions,
    totalSessions: plannedSessions.length,
    totalHours: parseFloat(((plannedSessions.length * sessionDuration) / 60).toFixed(1)),
    topicsHandled: topicQueue.filter((t) => t.allocatedSessions > 0).length,
  };
};

module.exports = { generateDeterministicSchedule };
