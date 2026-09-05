const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyPlan',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      default: null,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid HH:MM time format'],
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid HH:MM time format'],
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 10,
    },
    sessionType: {
      type: String,
      enum: ['LEARNING', 'REVISION', 'PRACTICE', 'BUFFER'],
      default: 'LEARNING',
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'PARTIALLY_COMPLETED', 'MISSED'],
      default: 'SCHEDULED',
    },
    actualMinutesSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
