const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Session = require('../models/Session');
const { extractTextFromPdfBuffer } = require('../services/pdfService');
const { extractSyllabusTopics } = require('../services/geminiService');

// --- SUBJECT OPERATIONS ---

// @desc    Get all subjects for current student with their topics
// @route   GET /api/subjects
const getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ userId: req.user.userId }).sort({ examDate: 1 }).lean();

    // Attach topics to each subject
    const subjectIds = subjects.map((s) => s._id);
    const topics = await Topic.find({ subjectId: { $in: subjectIds }, userId: req.user.userId }).lean();

    const result = subjects.map((subject) => {
      const subjectTopics = topics.filter(
        (t) => t.subjectId.toString() === subject._id.toString()
      );
      const totalHours = subjectTopics.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
      const completedHours = subjectTopics.reduce((acc, t) => acc + (t.completedHours || 0), 0);
      const progressPercent = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;

      return {
        ...subject,
        topics: subjectTopics,
        totalTopics: subjectTopics.length,
        totalHours: parseFloat(totalHours.toFixed(1)),
        completedHours: parseFloat(completedHours.toFixed(1)),
        progressPercent,
      };
    });

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new subject
// @route   POST /api/subjects
const createSubject = async (req, res, next) => {
  try {
    let { name, color, examDate, priorityWeight } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter a subject name.' });
    }

    name = name.trim();
    if (name.length > 80) {
      return res.status(400).json({ success: false, message: 'Subject name cannot exceed 80 characters.' });
    }

    if (!examDate) {
      return res.status(400).json({ success: false, message: 'Please provide an exam date.' });
    }

    const exam = new Date(examDate);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (isNaN(exam.getTime()) || exam <= todayStart) {
      return res.status(400).json({
        success: false,
        message: 'Exam date must be in the future (at least tomorrow).',
      });
    }

    // Check duplicate subject name for this user (case-insensitive)
    const duplicate = await Subject.findOne({
      userId: req.user.userId,
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `You already have a subject named "${name}".`,
      });
    }

    const priority = Math.min(5, Math.max(1, Number(priorityWeight) || 3));

    const subject = await Subject.create({
      userId: req.user.userId,
      name,
      color: color || '#4f46e5',
      examDate: exam,
      priorityWeight: priority,
    });

    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a subject
// @route   PUT /api/subjects/:id
const updateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    let { name, color, examDate, priorityWeight } = req.body;

    if (name !== undefined) {
      name = name.trim();
      if (!name) {
        return res.status(400).json({ success: false, message: 'Subject name cannot be empty.' });
      }
      if (name.length > 80) {
        return res.status(400).json({ success: false, message: 'Subject name cannot exceed 80 characters.' });
      }

      // Check duplicate name excluding self
      const duplicate = await Subject.findOne({
        _id: { $ne: subject._id },
        userId: req.user.userId,
        name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: `A subject named "${name}" already exists.` });
      }
      subject.name = name;
    }

    if (color) subject.color = color;

    if (examDate) {
      const exam = new Date(examDate);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      if (isNaN(exam.getTime()) || exam <= todayStart) {
        return res.status(400).json({ success: false, message: 'Exam date must be in the future (at least tomorrow).' });
      }
      subject.examDate = exam;
    }

    if (priorityWeight !== undefined) {
      subject.priorityWeight = Math.min(5, Math.max(1, Number(priorityWeight) || 3));
    }

    await subject.save();
    res.json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a subject (cascades topics and sessions)
// @route   DELETE /api/subjects/:id
const deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    await Topic.deleteMany({ subjectId: subject._id, userId: req.user.userId });
    await Session.deleteMany({ subjectId: subject._id, userId: req.user.userId });
    await subject.deleteOne();

    res.json({ success: true, message: 'Subject and all associated topics deleted.' });
  } catch (error) {
    next(error);
  }
};

// --- TOPIC OPERATIONS ---

// @desc    Add a topic to a subject
// @route   POST /api/subjects/:subjectId/topics
const createTopic = async (req, res, next) => {
  try {
    let { title, estimatedHours, difficulty, confidenceLevel } = req.body;
    const { subjectId } = req.params;

    const subject = await Subject.findOne({ _id: subjectId, userId: req.user.userId });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter a topic title.' });
    }

    title = title.trim();
    if (title.length > 120) {
      return res.status(400).json({ success: false, message: 'Topic title cannot exceed 120 characters.' });
    }

    // Check duplicate topic title within this subject
    const duplicate = await Topic.findOne({
      subjectId,
      userId: req.user.userId,
      title: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (duplicate) {
      return res.status(400).json({ success: false, message: `A topic named "${title}" already exists in this subject.` });
    }

    const hours = Number(estimatedHours);
    if (isNaN(hours) || hours < 0.5 || hours > 50) {
      return res.status(400).json({ success: false, message: 'Estimated hours must be between 0.5 and 50 hours.' });
    }

    const diff = Math.min(5, Math.max(1, Math.round(Number(difficulty) || 3)));
    const conf = Math.min(5, Math.max(1, Math.round(Number(confidenceLevel) || 3)));

    const topic = await Topic.create({
      subjectId,
      userId: req.user.userId,
      title,
      estimatedHours: hours,
      difficulty: diff,
      confidenceLevel: conf,
    });

    res.status(201).json({ success: true, data: topic });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a topic
// @route   PUT /api/topics/:id
const updateTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found.' });
    }

    let { title, estimatedHours, difficulty, confidenceLevel, status, completedHours } = req.body;

    if (title !== undefined) {
      title = title.trim();
      if (!title) {
        return res.status(400).json({ success: false, message: 'Topic title cannot be empty.' });
      }
      if (title.length > 120) {
        return res.status(400).json({ success: false, message: 'Topic title cannot exceed 120 characters.' });
      }

      const duplicate = await Topic.findOne({
        _id: { $ne: topic._id },
        subjectId: topic.subjectId,
        userId: req.user.userId,
        title: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: `A topic named "${title}" already exists in this subject.` });
      }
      topic.title = title;
    }

    if (estimatedHours !== undefined) {
      const hours = Number(estimatedHours);
      if (isNaN(hours) || hours < 0.5 || hours > 50) {
        return res.status(400).json({ success: false, message: 'Estimated hours must be between 0.5 and 50 hours.' });
      }
      topic.estimatedHours = hours;
    }

    if (difficulty !== undefined) {
      topic.difficulty = Math.min(5, Math.max(1, Math.round(Number(difficulty) || 3)));
    }

    if (confidenceLevel !== undefined) {
      topic.confidenceLevel = Math.min(5, Math.max(1, Math.round(Number(confidenceLevel) || 3)));
    }

    if (status !== undefined) topic.status = status;
    if (completedHours !== undefined) topic.completedHours = Math.max(0, Number(completedHours) || 0);

    await topic.save();
    res.json({ success: true, data: topic });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a topic
// @route   DELETE /api/topics/:id
const deleteTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found.' });
    }

    await Session.deleteMany({ topicId: topic._id, userId: req.user.userId });
    await topic.deleteOne();

    res.json({ success: true, message: 'Topic deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// --- SYLLABUS PDF IMPORT OPERATIONS ---

// @desc    Extract structured units & topics from an uploaded syllabus PDF
// @route   POST /api/subjects/:subjectId/syllabus/extract
const extractSyllabus = async (req, res, next) => {
  try {
    const { subjectId } = req.params;

    const subject = await Subject.findOne({ _id: subjectId, userId: req.user.userId });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Please upload a valid syllabus PDF file.' });
    }

    // 1. Extract plain text from in-memory PDF buffer
    const { text, numPages } = await extractTextFromPdfBuffer(req.file.buffer);
    console.log(`[PDF Extraction]: Extracted ${text.length} characters from ${numPages} page(s).`);

    // 2. Extract structured units and topics via Gemini 1.5 Flash (with regex fallback)
    const result = await extractSyllabusTopics(text, subject.name);

    // 3. Fetch existing topics in this subject for client-side duplicate badges
    const existingTopics = await Topic.find({ subjectId: subject._id, userId: req.user.userId })
      .select('title')
      .lean();
    const existingTitles = existingTopics.map((t) => t.title.toLowerCase().trim());

    const totalExtracted = (result.units || []).reduce((acc, u) => acc + (u.topics ? u.topics.length : 0), 0);
    console.log(`[PDF Extraction]: Detected ${result.units?.length || 0} unit(s) and ${totalExtracted} topic(s).`);

    res.json({
      success: true,
      subjectId: subject._id,
      subjectName: subject.name,
      numPages,
      units: result.units,
      source: result.source,
      warning: result.warning || null,
      totalExtracted,
      existingTopicTitles: existingTitles,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk save confirmed topics from syllabus import
// @route   POST /api/subjects/:subjectId/syllabus/import-topics
const importSyllabusTopics = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const { topics } = req.body;

    const subject = await Subject.findOne({ _id: subjectId, userId: req.user.userId });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    if (!Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of topics to import.' });
    }

    // Fetch existing topics to prevent duplicates
    const existingTopics = await Topic.find({ subjectId: subject._id, userId: req.user.userId }).lean();
    const existingTitleSet = new Set(existingTopics.map((t) => t.title.trim().toLowerCase()));

    const seenInBatch = new Set();
    const validNewTopics = [];
    let duplicateCount = 0;

    for (const t of topics) {
      let rawTitle = typeof t === 'string' ? t : t?.title;
      if (!rawTitle || typeof rawTitle !== 'string') continue;

      const cleanTitle = rawTitle.trim().slice(0, 120);
      if (cleanTitle.length < 2) continue;

      const lowerTitle = cleanTitle.toLowerCase();

      // Check if already in DB or already added in this batch
      if (existingTitleSet.has(lowerTitle) || seenInBatch.has(lowerTitle)) {
        duplicateCount++;
        continue;
      }

      seenInBatch.add(lowerTitle);

      const hours = Math.min(50, Math.max(0.5, Number(t?.estimatedHours) || 2));
      const diff = Math.min(5, Math.max(1, Math.round(Number(t?.difficulty) || 3)));
      const conf = Math.min(5, Math.max(1, Math.round(Number(t?.confidenceLevel) || 3)));

      validNewTopics.push({
        subjectId: subject._id,
        userId: req.user.userId,
        title: cleanTitle,
        estimatedHours: hours,
        difficulty: diff,
        confidenceLevel: conf,
        completedHours: 0,
        status: 'PENDING',
      });
    }

    let insertedDocs = [];
    if (validNewTopics.length > 0) {
      insertedDocs = await Topic.insertMany(validNewTopics);
    }

    // Recalculate subject summary stats
    const allSubjectTopics = await Topic.find({ subjectId: subject._id, userId: req.user.userId }).lean();
    const totalHours = allSubjectTopics.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const completedHours = allSubjectTopics.reduce((acc, t) => acc + (t.completedHours || 0), 0);
    const progressPercent = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;

    res.status(201).json({
      success: true,
      count: insertedDocs.length,
      skippedDuplicates: duplicateCount,
      data: allSubjectTopics,
      summary: {
        totalTopics: allSubjectTopics.length,
        totalHours: parseFloat(totalHours.toFixed(1)),
        completedHours: parseFloat(completedHours.toFixed(1)),
        progressPercent,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  createTopic,
  updateTopic,
  deleteTopic,
  extractSyllabus,
  importSyllabusTopics,
};
