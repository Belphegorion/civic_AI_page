// backend/config/index.js
require('dotenv').config();

const toInt = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
};

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 5000),

  // DB / Redis
  mongoUri: process.env.MONGO_URI || 'mongodb://mongo:27017/civic_connect',
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',

  // Auth
  jwtSecret: process.env.JWT_SECRET || 'change-this-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  // Sentry
  sentryDsn: process.env.SENTRY_DSN || '',

  // Rate limiter defaults (user-keyed)
  rateLimit: {
    windowMs: toInt(process.env.RATE_WINDOW_MS, 15 * 60 * 1000),
    max: toInt(process.env.RATE_MAX, 100),
    createReportMax: toInt(process.env.RATE_CREATE_REPORT_MAX, 60),
    createReportWindowMs: toInt(process.env.RATE_CREATE_REPORT_WINDOW_MS, 60 * 60 * 1000)
  },

  // Prometheus
  enablePrometheus: (process.env.ENABLE_PROMETHEUS || 'true') === 'true',

  // Other
  logsPath: process.env.LOGS_PATH || 'logs'
};
