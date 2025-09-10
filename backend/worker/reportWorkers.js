// backend/worker/reportWorker.js
const Report = require('../models/Report');
const { analyzeImageBuffer } = require('../services/aiService');
const { routeReportToDepartment } = require('../services/routingEngine');
const { notificationQueue } = require('../queues/queues');
const logger = require('../utils/logger');

module.exports = function(reportQueue, io) {
  // concurrency 2 with automatic retries handled by job options set when adding
  reportQueue.process(2, async (job) => {
    const { reportId, imageBuffers } = job.data;
    logger.info('reportWorker processing reportId=%s jobId=%s jobType=%s', reportId, job.id, job.data && job.data.jobType);

    const report = await Report.findById(reportId);
    if (!report) {
      throw new Error('Report not found: ' + reportId);
    }

    // Analyze each image buffer (if present)
    if (Array.isArray(imageBuffers) && imageBuffers.length) {
      for (let i = 0; i < imageBuffers.length; i += 1) {
        try {
          const buffer = Buffer.from(imageBuffers[i], 'base64');
          const analysis = await analyzeImageBuffer(buffer);
          if (report.images && report.images[i]) {
            report.images[i].analysis = analysis;
          }
        } catch (err) {
          // allow retry by rethrowing for transient errors
          logger.warn('Image analysis failed for report %s index=%d err=%s', reportId, i, err.message);
          throw err;
        }
      }
    }

    // Re-run routing in case analysis suggested a different department
    const dept = await routeReportToDepartment(report.category);
    report.assignedToDepartment = dept._id;

    // Promote priority based on detected issues (simple heuristic)
    try {
      const allDetected = (report.images || []).flatMap((img) => (img.analysis && img.analysis.detectedIssues) || []);
      if (allDetected.includes('gas_leak') || allDetected.includes('public_safety')) {
        report.priority = 'critical';
      } else if (allDetected.includes('water_leak') || allDetected.includes('tree_hazard')) {
        report.priority = 'high';
      }
    } catch (e) {
      logger.warn('Priority heuristic failed for report %s err=%s', reportId, e.message);
    }

    await report.save();

    if (io) io.emit('report:processed', report);

    if (report.reportedBy) {
      // include jobType in notification job data
      notificationQueue.add(
        'report-status-change',
        {
          userId: report.reportedBy.toString(),
          reportId: report._id.toString(),
          status: report.status,
          jobType: 'report-status-change'
        },
        { attempts: 3, backoff: { type: 'fixed', delay: 2000 }, removeOnComplete: true }
      );
    }

    return { success: true };
  });
};
