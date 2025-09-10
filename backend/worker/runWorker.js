// backend/worker/runWorkers.js
require('dotenv').config();
const connectDB = require('../config/db');
const { reportQueue, notificationQueue } = require('../queues/queues');
const startReportWorker = require('./reportWorker');
const startNotificationWorker = require('./notificationWorker');
const logger = require('../utils/logger');

(async () => {
  try {
    await connectDB();
    logger.info('DB connected for workers');

    // Optional: attach top-level listeners
    reportQueue.on('waiting', (jobId) => logger.info('ReportQueue waiting job=%s', jobId));
    reportQueue.on('stalled', (job) => logger.warn('ReportQueue stalled job=%s', job.id));
    reportQueue.on('failed', (job, err) => logger.warn('ReportQueue failed job=%s err=%s attempts=%d', job.id, err.message, job.attemptsMade));
    reportQueue.on('error', (err) => logger.error('ReportQueue error: %s', err.message));

    notificationQueue.on('error', (err) => logger.error('NotificationQueue error: %s', err.message));

    startReportWorker(reportQueue, null); // pass io if you want socket emits from worker
    startNotificationWorker(notificationQueue);

    logger.info('Workers started');
  } catch (err) {
    logger.error('Worker boot error: %s', err.message);
    process.exit(1);
  }
})();
