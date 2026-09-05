const { recalculateMissedSession } = require('../services/rescheduleService');
const { getTopicStudyTip } = require('../services/geminiService');
const Topic = require('../models/Topic');

// @desc    Trigger adaptive rescheduling for a missed or partial study session
// @route   POST /api/reschedule/recalculate
const triggerReschedule = async (req, res, next) => {
  try {
    const { sessionId, actualMinutes } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const result = await recalculateMissedSession(
      req.user.userId,
      sessionId,
      Number(actualMinutes) || 0
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get an on-demand AI study tip for a specific topic
// @route   GET /api/reschedule/topic-tip/:topicId
const getTopicAdvice = async (req, res, next) => {
  try {
    const topic = await Topic.findOne({ _id: req.params.topicId, userId: req.user.userId });
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    const tip = await getTopicStudyTip(topic.title, topic.difficulty);
    res.json({ success: true, tip });
  } catch (error) {
    next(error);
  }
};

module.exports = { triggerReschedule, getTopicAdvice };
