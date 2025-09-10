// backend/controllers/opsController.js
const { reportQueue, notificationQueue } = require('../queues/queues');
const DeadLetter = require('../models/DeadLetter');
const client = require('prom-client');
const logger = require('../utils/logger');

exports.metricsJson = async (req, res, next) => {
  try {
    // Queue counts
    const reportCounts = await reportQueue.getJobCounts();
    const notificationCounts = await notificationQueue.getJobCounts();

    // Dead-letter counts aggregated by jobType and queue
    const totalDead = await DeadLetter.countDocuments();

    const byJobType = await DeadLetter.aggregate([
      {
        $group: {
          _id: { queue: '$opts.queue', jobType: '$data.jobType' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Optionally include Prometheus metric snapshot for a couple counters
    const reportFailMetric = await client.register.getSingleMetricAsString('bull_report_processing_failed_total').catch(() => '');
    const deadLetterMetric = await client.register.getSingleMetricAsString('civic_dead_letter_total').catch(() => '');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      queues: {
        report: reportCounts,
        notification: notificationCounts
      },
      deadLetters: {
        total: totalDead,
        byJobType: byJobType
      },
      metricsSample: {
        bull_report_processing_failed_total: reportFailMetric || null,
        civic_dead_letter_total: deadLetterMetric || null
      },
      uptimeSeconds: process.uptime()
    });
  } catch (err) {
    logger.error('opsController.metricsJson error: %s', err.message);
    next(err);
  }
};
