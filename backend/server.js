// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const socketIo = require('socket.io');
const Sentry = require('@sentry/node');
const client = require('prom-client');

require('dotenv').config();

const config = require('./config');
const connectDB = require('./config/db');
const { createRedisClient } = require('./config/redis');
const { initializeAI } = require('./services/aiService');
const { startScheduledJobs } = require('./utils/scheduler');
const { reportQueue, notificationQueue } = require('./queues/queues');
const logger = require('./utils/logger');
const { globalErrorHandler } = require('./middleware/errorHandler');
const { userKeyLimiter, createReportLimiter } = require('./middleware/userRateLimiter');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }
});

// Sentry init (optional) - request handler must be registered before routes
if (config.sentryDsn) {
  Sentry.init({ dsn: config.sentryDsn, environment: config.env });
  app.use(Sentry.Handlers.requestHandler());
  logger.info('Sentry initialized');
}

// Prometheus metrics
if (config.enablePrometheus) {
  client.collectDefaultMetrics();
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });
  logger.info('Prometheus metrics endpoint enabled at /metrics');
}

// Connect to Redis asynchronously and set on app when ready
let redisClient = null;
(async () => {
  try {
    redisClient = await createRedisClient();
    app.set('redis', redisClient); // set after connection
    logger.info('Redis client connected and set on app');
  } catch (err) {
    // If Redis is unavailable, we continue (some features will degrade)
    logger.warn('Redis client not available: %s', err.message);
    app.set('redis', null);
  }
})();

// Connect DB and initialize AI (non-blocking here)
connectDB();
initializeAI();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));

// Add caching headers for static assets
app.use((req, res, next) => {
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  } else if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Attach socket.io and queues to app (queues already created by import)
app.set('io', io);
app.set('reportQueue', reportQueue);
app.set('notificationQueue', notificationQueue);

// Apply user-keyed limiter globally (skip metrics)
app.use((req, res, next) => {
  if (req.path === '/metrics') return next();
  userKeyLimiter(req, res, next);
});

// Mount routes (single, intentional mounts)
app.use('/api/auth', require('./routes/authRoutes'));
const reportRoutes = require('./routes/reportRoutes');
app.use('/api/reports', (req, res, next) => {
  // stricter limiter only for POST /
  if (req.method === 'POST' && req.path === '/') return createReportLimiter(req, res, next);
  return next();
}, reportRoutes);
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/health', require('./routes/healthRoutes'));
app.use('/api/deadletters', require('./routes/deadLetterRoutes'));
app.use('/api/ops', require('./routes/opsRoutes'));

// Sentry error handler (if enabled) should be registered before other error handlers
if (config.sentryDsn) {
  app.use(Sentry.Handlers.errorHandler());
}

// Global error handler (last)
app.use(globalErrorHandler);

// Start scheduled jobs (cron, cleanup tasks, analytics)
startScheduledJobs();

// Start server
const PORT = config.port || 5000;
server.listen(PORT, () => {
  logger.info('Server running on port %d in env=%s', PORT, config.env);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info('New client connected: %s', socket.id);
  socket.on('join-room', (roomId) => { socket.join(roomId); });
  socket.on('leave-room', (roomId) => { socket.leave(roomId); });
  socket.on('disconnect', () => { logger.info('Client disconnected: %s', socket.id); });
});

// Graceful shutdown handlers (optional, recommended for production)
const gracefulShutdown = async () => {
  logger.info('Graceful shutdown starting...');
  try {
    // stop accepting new connections
    server.close(() => logger.info('HTTP server closed'));
    // close redis
    if (redisClient && typeof redisClient.quit === 'function') {
      await redisClient.quit();
      logger.info('Redis client disconnected');
    }
    // close queues
    try {
      await reportQueue.close();
      await notificationQueue.close();
      logger.info('Queues closed');
    } catch (qErr) {
      logger.warn('Error closing queues: %s', qErr.message);
    }
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown: %s', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
