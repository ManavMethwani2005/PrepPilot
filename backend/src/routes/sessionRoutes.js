const express = require('express');
const router = express.Router();
const { getSessions, getSessionById, updateSessionStatus } = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getSessions);
router.get('/:id', getSessionById);
router.patch('/:id/status', updateSessionStatus);

module.exports = router;
