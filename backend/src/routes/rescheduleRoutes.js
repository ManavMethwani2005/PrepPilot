const express = require('express');
const router = express.Router();
const { triggerReschedule, getTopicAdvice } = require('../controllers/rescheduleController');
const { protect } = require('../middleware/authMiddleware');
const { planLimiter } = require('../middleware/rateLimiter');

router.use(protect);

router.post('/recalculate', planLimiter, triggerReschedule);
router.get('/topic-tip/:topicId', getTopicAdvice);

module.exports = router;
