// backend/controllers/deadLetterController.js
const DeadLetter = require('../models/DeadLetter');
const { reportQueue } = require('../queues/queues');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    const skip = (page - 1) * limit;

    const docs = await DeadLetter.find().sort({ timestamp: -1 }).skip(skip).limit(limit);
    const total = await DeadLetter.countDocuments();
    res.json({ total, page, limit, items: docs });
  } catch (err) {
    logger.error('deadLetter.list error: %s', err.message);
    next(err);
  }
};

exports.requeue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dead = await DeadLetter.findById(id);
    if (!dead) return next(new AppError('Dead letter not found', 404));

    // Decide how to requeue: for report-processing job we assume data contains reportId and imageBuffers
    const data = dead.data || dead.payload || {};
    // Add new job with limited attempts to avoid infinite loops
    await reportQueue.add(data, { attempts: 3, backoff: { type: 'exponential', delay: 3000 } });

    // Optionally remove the dead-letter record (or mark requeued)
    await DeadLetter.findByIdAndDelete(id);
    logger.info('Dead-letter requeued and deleted id=%s jobId=%s', id, dead.jobId || 'n/a');
    res.json({ ok: true });
  } catch (err) {
    logger.error('deadLetter.requeue error: %s', err.message);
    next(err);
  }
};
