const express = require('express');
const cors = require('cors');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const planRoutes = require('./routes/planRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const rescheduleRoutes = require('./routes/rescheduleRoutes');

const app = express();

// CORS configuration: allow dev localhost:4200 and production client
const configuredOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/+$/, ''))
  : [];

const allowedOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  ...configuredOrigins,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      const normalizedOrigin = origin ? origin.replace(/\/+$/, '') : origin;
      if (!origin || allowedOrigins.includes(normalizedOrigin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy.'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(generalLimiter);

// Health check endpoint for Render/uptime monitors
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'PrepPilot Backend', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/reschedule', rescheduleRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
