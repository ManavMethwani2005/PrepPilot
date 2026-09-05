const express = require('express');
const router = express.Router();
const {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  createTopic,
  updateTopic,
  deleteTopic,
  extractSyllabus,
  importSyllabusTopics,
} = require('../controllers/subjectController');
const { protect } = require('../middleware/authMiddleware');
const { handlePdfUpload } = require('../middleware/uploadMiddleware');

// All subject routes require authentication
router.use(protect);

router.route('/')
  .get(getSubjects)
  .post(createSubject);

router.route('/:id')
  .put(updateSubject)
  .delete(deleteSubject);

// Topics nested under subjects
router.post('/:subjectId/topics', createTopic);
router.put('/topics/:id', updateTopic);
router.delete('/topics/:id', deleteTopic);

// Syllabus PDF extraction & bulk import
router.post('/:subjectId/syllabus/extract', handlePdfUpload, extractSyllabus);
router.post('/:subjectId/syllabus/import-topics', importSyllabusTopics);

module.exports = router;
