const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Topic title is required'],
      trim: true,
    },
    estimatedHours: {
      type: Number,
      required: true,
      min: 0.5,
      max: 100,
      default: 2,
    },
    difficulty: {
      type: Number,
      min: 1,
      max: 5,
      default: 3, // 1: Very Easy, 5: Very Hard
    },
    confidenceLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 3, // 1: Very Low, 5: Mastered
    },
    completedHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
      default: 'PENDING',
    },
    revisionCount: {
      type: Number,
      default: 0,
    },
    lastStudiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Topic', topicSchema);
