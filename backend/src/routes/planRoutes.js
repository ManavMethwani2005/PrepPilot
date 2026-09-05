const express = require('express');
const router = express.Router();
const { generatePlan, getActivePlan, getPlanStats } = require('../controllers/planController');
const { protect } = require('../middleware/authMiddleware');
const { planLimiter } = require('../middleware/rateLimiter');

router.use(protect);

router.post('/generate', planLimiter, generatePlan);
router.get('/active', getActivePlan);
router.get('/stats', getPlanStats);

module.exports = router;
