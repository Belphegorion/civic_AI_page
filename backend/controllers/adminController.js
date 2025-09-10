// backend/controllers/adminController.js
const Report = require('../models/Report');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const { notificationQueue } = require('../queues/queues');

exports.assignReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { departmentId } = req.body;
    const report = await Report.findById(id);
    if (!report) {
      logger.warn('assignReport not found id=%s', id);
      return next(new AppError('Report not found', 404));
    }
    report.assignedToDepartment = departmentId;
    report.status = 'assigned';
    await report.save();
    logger.info('Report assigned id=%s dept=%s by=%s', report._id, departmentId, req.user ? req.user._id : 'system');

    const io = req.app.get('io');
    if (io) io.emit('report:assigned', report);

    // Notify the reporter about assignment, if exists
    if (report.reportedBy) {
      notificationQueue.add(
        'report-assigned',
        {
          userId: report.reportedBy.toString(),
          reportId: report._id.toString(),
          status: report.status,
          jobType: 'report-assigned'
        },
        { attempts: 3, backoff: { type: 'fixed', delay: 2000 }, removeOnComplete: true }
      );
    }

    res.json(report);
  } catch (err) {
    logger.error('assignReport error: %s', err.message);
    next(err);
  }
};
