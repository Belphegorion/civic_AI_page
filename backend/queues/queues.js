// backend/queues/queues.js
const Bull = require('bull');
const logger = require('../utils/logger');
const DeadLetter = require('../models/DeadLetter');
const client = require('prom-client');
const config = require('../config');

const redisUrl = config.redisUrl || 'redis://localhost:6379';

const reportQueue = new Bull('report-processing', {
  redis: { url: redisUrl }
});

const notificationQueue = new Bull('notifications', {
  redis: { url: redisUrl }
});

// Prometheus metrics
// Gauges for queue states (by state label)
const reportQueueGauge = new client.Gauge({
  name: 'report_queue_jobs',
  help: 'Number of jobs in report-processing queue by state',
  labelNames: ['state']
});

const notificationQueueGauge = new client.Gauge({
  name: 'notification_queue_jobs',
  help: 'Number of jobs in notification queue by state',
  labelNames: ['state']
});

// Counters for final/exhausted failures and dead letters (labeled with jobType)
const reportFinalFailedCounter = new client.Counter({
  name: 'bull_report_processing_failed_total',
  help: 'Total number of jobs in report-processing queue that exhausted retries and failed',
  labelNames: ['queue', 'jobType']
});

const notificationFinalFailedCounter = new client.Counter({
  name: 'bull_notification_failed_total',
  help: 'Total number of notification jobs that exhausted retries and failed',
  labelNames: ['queue', 'jobType']
});

const deadLetterCounter = new client.Counter({
  name: 'civic_dead_letter_total',
  help: 'Total number of jobs persisted into dead-letter store (final failures)',
  labelNames: ['queue', 'jobType']
});

// helper: convert job.name or job.data to a short jobType (limit cardinality)
const extractJobType = (job) => {
  // Prefer explicit jobType in data (job.data.jobType)
  if (job && job.data && job.data.jobType) return String(job.data.jobType).slice(0, 64);

  // Fallback: use job.name, but reduce complexity: take substring up to first colon or slash
  if (job && job.name) {
    const name = String(job.name);
    const simple = name.split(/[:\/]/)[0];
    return simple.slice(0, 64);
  }

  return 'unknown';
};

// helper to refresh counts periodically (used by gauges)
const refreshQueueCounts = async () => {
  try {
    const rq = await reportQueue.getJobCounts();
    Object.keys(rq).forEach((k) => {
      reportQueueGauge.set({ state: k }, rq[k]);
    });

    const nq = await notificationQueue.getJobCounts();
    Object.keys(nq).forEach((k) => {
      notificationQueueGauge.set({ state: k }, nq[k]);
    });
  } catch (err) {
    logger.warn('Failed to refresh queue counts for prometheus: %s', err.message);
  }
};

// refresh every 10s
setInterval(refreshQueueCounts, 10000);
refreshQueueCounts().catch(() => {});

// Event listeners - logging & dead-letter persistence, counters increment only on final failures
reportQueue.on('error', (err) => logger.error('ReportQueue error: %s', err.message));

reportQueue.on('failed', async (job, err) => {
  logger.warn('ReportQueue job failed id=%s attemptsMade=%d err=%s', job.id, job.attemptsMade, err.message);

  try {
    const maxAttempts = (job.opts && job.opts.attempts) || 0;
    // If job exhausted its attempts, persist and increment final-failure counters
    if (maxAttempts > 0 && job.attemptsMade >= maxAttempts) {
      const jobType = extractJobType(job);

      // persist to dead-letter collection
      await DeadLetter.create({
        jobId: job.id?.toString(),
        name: job.name,
        data: job.data,
        failedReason: (err && err.message) || String(err),
        attemptsMade: job.attemptsMade,
        opts: job.opts || {}
      });

      // increment final-failure counter with labels
      try {
        reportFinalFailedCounter.inc({ queue: 'report-processing', jobType }, 1);
      } catch (incErr) {
        logger.warn('Failed to increment reportFinalFailedCounter: %s', incErr.message);
      }

      // increment dead-letter counter (same label set)
      try {
        deadLetterCounter.inc({ queue: 'report-processing', jobType }, 1);
      } catch (incErr) {
        logger.warn('Failed to increment deadLetterCounter: %s', incErr.message);
      }

      logger.error('Job id=%s persisted to DeadLetter store (final failure) jobType=%s', job.id, jobType);
    }
  } catch (saveErr) {
    logger.error('Failed to write dead-letter for job id=%s err=%s', job.id, saveErr.message);
  }
});

reportQueue.on('completed', (job) => logger.info('ReportQueue job completed id=%s', job.id));

// Notification queue event handlers (same semantics)
notificationQueue.on('error', (err) => logger.error('NotificationQueue error: %s', err.message));

notificationQueue.on('failed', async (job, err) => {
  logger.warn('NotificationQueue job failed id=%s attemptsMade=%d err=%s', job.id, job.attemptsMade, err.message);

  try {
    const maxAttempts = (job.opts && job.opts.attempts) || 0;
    if (maxAttempts > 0 && job.attemptsMade >= maxAttempts) {
      const jobType = extractJobType(job);

      await DeadLetter.create({
        jobId: job.id?.toString(),
        name: job.name,
        data: job.data,
        failedReason: (err && err.message) || String(err),
        attemptsMade: job.attemptsMade,
        opts: job.opts || {}
      });

      try {
        notificationFinalFailedCounter.inc({ queue: 'notifications', jobType }, 1);
      } catch (incErr) {
        logger.warn('Failed to increment notificationFinalFailedCounter: %s', incErr.message);
      }

      try {
        deadLetterCounter.inc({ queue: 'notifications', jobType }, 1);
      } catch (incErr) {
        logger.warn('Failed to increment deadLetterCounter: %s', incErr.message);
      }

      logger.error('Notification job id=%s persisted to DeadLetter store (final failure) jobType=%s', job.id, jobType);
    }
  } catch (saveErr) {
    logger.error('Failed to write dead-letter for notification job id=%s err=%s', job.id, saveErr.message);
  }
});

notificationQueue.on('completed', (job) => logger.info('NotificationQueue job completed id=%s', job.id));

module.exports = { reportQueue, notificationQueue };
