const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'preppilot_secret_key',
    { expiresIn: '7d' }
  );
};

// @desc    Register a new student
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    let { email, password, fullName } = req.body;

    if (!email || !email.trim() || !password || !fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your full name, email, and password.',
      });
    }

    email = email.trim().toLowerCase();
    fullName = fullName.trim();

    if (fullName.length > 80) {
      return res.status(400).json({
        success: false,
        message: 'Full name cannot exceed 80 characters.',
      });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      email,
      passwordHash,
      fullName,
    });

    const token = generateToken(user._id, user.email);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login student
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user._id, user.email);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current student profile
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update study preferences
// @route   PATCH /api/auth/preferences
const updatePreferences = async (req, res, next) => {
  try {
    const { dailyAvailableHours, preferredPeriod, energyPeakTime, sessionDurationMinutes, breakDurationMinutes } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (dailyAvailableHours !== undefined) {
      const hours = Number(dailyAvailableHours);
      if (isNaN(hours) || hours < 0.5 || hours > 14) {
        return res.status(400).json({ success: false, message: 'Daily available hours must be between 0.5 and 14 hours.' });
      }
      user.preferences.dailyAvailableHours = hours;
    }

    const validPeriods = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];
    if (preferredPeriod !== undefined && validPeriods.includes(preferredPeriod)) {
      user.preferences.preferredPeriod = preferredPeriod;
    }

    const validEnergy = ['EARLY_DAY', 'LATE_DAY'];
    if (energyPeakTime !== undefined && validEnergy.includes(energyPeakTime)) {
      user.preferences.energyPeakTime = energyPeakTime;
    }

    if (sessionDurationMinutes !== undefined) {
      const sess = Math.min(90, Math.max(15, Number(sessionDurationMinutes) || 50));
      user.preferences.sessionDurationMinutes = sess;
    }

    if (breakDurationMinutes !== undefined) {
      const brk = Math.min(30, Math.max(5, Number(breakDurationMinutes) || 10));
      user.preferences.breakDurationMinutes = brk;
    }

    await user.save();

    res.json({
      success: true,
      preferences: user.preferences,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updatePreferences };
