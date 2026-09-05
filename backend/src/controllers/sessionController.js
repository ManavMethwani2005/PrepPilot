const Session = require('../models/Session');
const Topic = require('../models/Topic');

// @desc    Get study sessions within a date range
// @route   GET /api/sessions
const getSessions = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const sessions = await Session.find(query)
      .populate('subjectId', 'name color examDate priorityWeight')
      .populate('topicId', 'title difficulty confidenceLevel estimatedHours completedHours status')
      .sort({ date: 1, startTime: 1 })
      .lean();

    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single study session by ID
// @route   GET /api/sessions/:id
const getSessionById = async (req, res, next) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user.userId })
      .populate('subjectId', 'name color examDate priorityWeight')
      .populate('topicId', 'title difficulty confidenceLevel estimatedHours completedHours status')
      .lean();

    if (!session) {
      return res.status(404).json({ success: false, message: 'Study session not found.' });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

// @desc    Update session status (mark completed, partial, or missed)
// @route   PATCH /api/sessions/:id/status
const updateSessionStatus = async (req, res, next) => {
  try {
    const { status, actualMinutesSpent, notes } = req.body;
    const session = await Session.findOne({ _id: req.params.id, userId: req.user.userId });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const validStatuses = ['SCHEDULED', 'COMPLETED', 'PARTIALLY_COMPLETED', 'MISSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid session status.' });
    }

    session.status = status;
    if (notes !== undefined) session.notes = notes;

    const minutesSpent = Math.max(0, Number(actualMinutesSpent) || (status === 'COMPLETED' ? session.durationMinutes : 0));
    session.actualMinutesSpent = minutesSpent;

    if (status === 'COMPLETED' || status === 'PARTIALLY_COMPLETED') {
      session.completedAt = new Date();

      // Update topic's completed hours if applicable
      if (session.topicId && minutesSpent > 0) {
        const topic = await Topic.findOne({ _id: session.topicId, userId: req.user.userId });
        if (topic) {
          const addedHours = parseFloat((minutesSpent / 60).toFixed(2));
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
    }

    await session.save();

    const requiresReschedule = status === 'MISSED' || (status === 'PARTIALLY_COMPLETED' && minutesSpent < session.durationMinutes);

    res.json({
      success: true,
      data: session,
      requiresReschedule,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSessions, getSessionById, updateSessionStatus };
