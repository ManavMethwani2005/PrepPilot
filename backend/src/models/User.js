const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    preferences: {
      dailyAvailableHours: {
        type: Number,
        default: 3,
        min: 1,
        max: 12,
      },
      preferredPeriod: {
        type: String,
        enum: ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'],
        default: 'MORNING',
      },
      energyPeakTime: {
        type: String,
        enum: ['EARLY_DAY', 'LATE_DAY'],
        default: 'EARLY_DAY',
      },
      sessionDurationMinutes: {
        type: Number,
        default: 50,
        min: 25,
        max: 90,
      },
      breakDurationMinutes: {
        type: Number,
        default: 10,
        min: 5,
        max: 30,
      },
    },
  },
  { timestamps: true }
);

// Method to verify password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
