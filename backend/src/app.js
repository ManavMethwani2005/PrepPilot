require('dotenv').config();
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

// Helper to parse comma-separated origin URLs from environment variables
function parseAllowedOrigins(rawClientUrl) {
  const defaultOrigins = [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'https://prep-pilot-brown.vercel.app',
  ];

  if (!rawClientUrl) {
    return defaultOrigins;
  }

  const unquoted = rawClientUrl.trim().replace(/^['"]+|['"]+$/g, '');
  const parsed = unquoted
    .split(',')
    .map((url) =>
      url
        .trim()
        .replace(/^['"]+|['"]+$/g, '')
        .trim()
        .replace(/\/+$/, '')
    )
    .filter(Boolean);

  return Array.from(new Set([...defaultOrigins, ...parsed]));
}

const allowedOrigins = parseAllowedOrigins(process.env.CLIENT_URL);

app.set('trust proxy', 1);

// CORS configuration: must be registered before any routes or body parsers
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, health checks)
      if (!origin) {
        return callback(null, true);
      }

      // Normalize incoming origin (trim, strip trailing slashes, case-insensitive comparison)
      const normalizedOrigin = origin.trim().replace(/\/+$/, '').toLowerCase();
      const isAllowed = allowedOrigins.some(
        (allowed) => allowed.toLowerCase() === normalizedOrigin
      );
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedOrigin);

      if (isAllowed || (process.env.NODE_ENV !== 'production' && isLocalhost)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    optionsSuccessStatus: 200,
  })
);

app.set('etag', false);
app.use(express.json());
app.use(generalLimiter);

// Prevent browser/client from caching dynamic user/planner API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

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
