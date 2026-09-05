const StudyPlan = require('../models/StudyPlan');
const Session = require('../models/Session');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const { generateDeterministicSchedule } = require('../services/schedulerService');
const { generatePlanAdvice } = require('../services/geminiService');

// @desc    Generate a new deterministic study plan with Gemini strategic insights
// @route   POST /api/plans/generate
const generatePlan = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const { startDate, endDate } = req.body || {};

    const subjects = await Subject.find({ userId: req.user.userId }).sort({ examDate: 1 });
    if (!subjects.length) {
      return res.status(400).json({
        success: false,
        message: 'Please add at least one subject with an upcoming exam date before generating a schedule.',
      });
    }

    // Verify user has pending topics
    const totalTopicsCount = await Topic.countDocuments({
      userId: req.user.userId,
      status: { $in: ['PENDING', 'IN_PROGRESS'] },
    });

    if (totalTopicsCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please add at least one topic or chapter to your subjects before generating a schedule.',
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Verify at least one subject has exam date in the future
    const futureSubjects = subjects.filter((s) => new Date(s.examDate) >= todayStart);
    if (!futureSubjects.length) {
      return res.status(400).json({
        success: false,
        message: 'All your subjects have exam dates in the past. Please update exam dates to future dates.',
      });
    }

    const planStart = startDate ? new Date(startDate) : new Date();
    planStart.setHours(0, 0, 0, 0);

    const latestExamDate = futureSubjects[futureSubjects.length - 1].examDate;
    const planEnd = endDate ? new Date(endDate) : new Date(latestExamDate);
    planEnd.setHours(23, 59, 59, 999);

    if (planEnd < planStart) {
      return res.status(400).json({
        success: false,
        message: 'Plan end date cannot be earlier than start date.',
      });
    }

    // 1. Run deterministic scheduling algorithm
    const scheduleResult = await generateDeterministicSchedule(
      user._id,
      planStart,
      planEnd,
      user.preferences
    );

    // 2. Prepare summary metrics for Gemini
    const subjectSummaries = futureSubjects.map((s) => ({
      name: s.name,
      examDate: s.examDate.toISOString().split('T')[0],
      priority: s.priorityWeight,
    }));

    // 3. Obtain low-token AI strategic advice (with automatic fallback safety)
    const aiAdvice = await generatePlanAdvice({
      totalSessions: scheduleResult.totalSessions,
      totalHours: scheduleResult.totalHours,
      subjectSummaries,
      preferences: user.preferences,
    });

    // 4. Archive any existing active plan
    await StudyPlan.updateMany({ userId: user._id, status: 'ACTIVE' }, { status: 'ARCHIVED' });

    // 5. Create new StudyPlan document
    const newPlan = await StudyPlan.create({
      userId: user._id,
      startDate: planStart,
      endDate: planEnd,
      status: 'ACTIVE',
      totalAllocatedHours: scheduleResult.totalHours,
      geminiSummary: aiAdvice.summary,
      strategicTip: aiAdvice.strategicTip,
    });

    // 6. Delete previous scheduled sessions and batch insert new sessions
    await Session.deleteMany({ userId: user._id, status: 'SCHEDULED' });

    const sessionsToInsert = scheduleResult.sessions.map((sess) => ({
      ...sess,
      planId: newPlan._id,
    }));

    await Session.insertMany(sessionsToInsert);

    res.status(201).json({
      success: true,
      data: {
        plan: newPlan,
        totalSessions: scheduleResult.totalSessions,
        totalHours: scheduleResult.totalHours,
        geminiSummary: newPlan.geminiSummary,
        strategicTip: newPlan.strategicTip,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active study plan
// @route   GET /api/plans/active
const getActivePlan = async (req, res, next) => {
  try {
    const activePlan = await StudyPlan.findOne({ userId: req.user.userId, status: 'ACTIVE' });
    if (!activePlan) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: activePlan });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard study statistics
// @route   GET /api/plans/stats
const getPlanStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [totalSessions, completedSessions, todaySessions, upcomingExams] = await Promise.all([
      Session.countDocuments({ userId }),
      Session.countDocuments({ userId, status: 'COMPLETED' }),
      Session.find({ userId, date: { $gte: todayStart, $lte: todayEnd } })
        .populate('subjectId', 'name color examDate')
        .populate('topicId', 'title difficulty confidenceLevel estimatedHours')
        .sort({ startTime: 1 }),
      Subject.countDocuments({ userId, examDate: { $gte: todayStart } }),
    ]);

    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalSessions,
        completedSessions,
        completionRate,
        upcomingExams,
        todaySessions,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { generatePlan, getActivePlan, getPlanStats };
