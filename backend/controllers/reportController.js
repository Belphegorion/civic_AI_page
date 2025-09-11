// backend/controllers/reportController.js
const cloudinary = require('../config/cloudinary');
const Report = require('../models/Report');
const { resizeToBuffer } = require('../utils/imageProcessor');
const { routeReportToDepartment } = require('../services/routingEngine');
const { reportQueue } = require('../queues/queues');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

exports.createReport = async (req, res, next) => {
  try {
    const { title, description, category, lng, lat, address } = req.body;
    if (!title || !description || !category || typeof lng === 'undefined' || typeof lat === 'undefined') {
      logger.warn('createReport missing fields user=%s', req.user ? req.user._id : 'anon');
      return next(new AppError('Missing required fields', 400));
    }

    logger.info('createReport received title=%s category=%s by=%s', title, category, req.user ? req.user._id : 'anon');

    const images = [];
    const files = req.files?.images || [];
    const audioFile = req.files?.audio?.[0];

    for (const file of files) {
      const processed = await resizeToBuffer(file.buffer, { width: 1200 });
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: 'civic-connect' }, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
        stream.end(processed);
      });

      images.push({
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        uploadedAt: new Date()
      });
      logger.info('Image uploaded publicId=%s', uploadResult.public_id);
    }

    // Handle audio file upload
    let audioData = null;
    if (audioFile) {
      const audioUploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ 
          folder: 'civic-connect/audio',
          resource_type: 'video' // Cloudinary treats audio as video
        }, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
        stream.end(audioFile.buffer);
      });

      audioData = {
        url: audioUploadResult.secure_url,
        publicId: audioUploadResult.public_id,
        uploadedAt: new Date()
      };
      logger.info('Audio uploaded publicId=%s', audioUploadResult.public_id);
    }

    const report = await Report.create({
      title,
      description,
      category,
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      address: address ? (typeof address === 'string' ? JSON.parse(address) : address) : undefined,
      images,
      audio: audioData,
      reportedBy: req.user ? req.user._id : null
    });

    const dept = await routeReportToDepartment(category);
    report.assignedToDepartment = dept._id;
    await report.save();

    // enqueue for heavy processing (pass base64 buffers) — include jobType meta
    const base64Buffers = (files || []).map(f => f.buffer.toString('base64'));
    await reportQueue.add(
      {
        reportId: report._id.toString(),
        imageBuffers: base64Buffers,
        jobType: 'image-analysis' // << important for metrics labeling
      },
      { attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: true, removeOnFail: false }
    );

    logger.info('Report created id=%s queued job for processing', report._id);

    const io = req.app.get('io');
    if (io) io.emit('report:created', report);

    res.status(201).json(report);
  } catch (err) {
    logger.error('createReport error: %s', err.message);
    next(err);
  }
};

exports.getReports = async (req, res, next) => {
  try {
    const { status, category, limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    // Get reports with pagination
    const reports = await Report.find(filter)
      .populate('reportedBy', 'name email')
      .populate('assignedToDepartment', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Report.countDocuments(filter);
    
    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    logger.error('getReports error: %s', err.message);
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, assignedToDepartment } = req.body;
    
    if (!status) {
      return next(new AppError('Status is required', 400));
    }
    
    const report = await Report.findById(id).populate('assignedToDepartment');
    if (!report) {
      logger.warn('updateStatus report not found id=%s', id);
      return next(new AppError('Report not found', 404));
    }

    // Authorization check: staff can only update reports assigned to their department
    if (req.user.role === 'staff' && report.assignedToDepartment._id.toString() !== req.user.assignedToDepartment.toString()) {
      logger.warn('Forbidden updateStatus user=%s report=%s', req.user._id, report._id);
      return next(new AppError('You are not authorized to update this report', 403));
    }
    
    // Update report
    report.status = status;
    if (assignedToDepartment && req.user.role === 'admin') { // only admin can re-assign
      report.assignedToDepartment = assignedToDepartment;
    }
    await report.save();
    
    logger.info('Report status updated id=%s status=%s by=%s', report._id, status, req.user ? req.user._id : 'system');
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) io.emit('report:updated', report);
    
    // Send notification if status changed and reporter exists
    if (report.reportedBy && report.status !== 'submitted') {
      const { notificationQueue } = require('../queues/queues');
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
    
    res.json(report);
  } catch (err) {
    logger.error('updateStatus error: %s', err.message);
    next(err);
  }
};

exports.getDepartmentReports = async (req, res, next) => {
  try {
    if (!req.user || !req.user.assignedToDepartment) {
      return next(new AppError('User not assigned to any department', 403));
    }

    const { status, category, limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter object
    const filter = { assignedToDepartment: req.user.assignedToDepartment };
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    // Get reports with pagination
    const reports = await Report.find(filter)
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Report.countDocuments(filter);
    
    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    logger.error('getDepartmentReports error: %s', err.message);
    next(err);
  }
};

exports.getMyReports = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { status, category, limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter object
    const filter = { reportedBy: req.user._id };
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    // Get reports with pagination
    const reports = await Report.find(filter)
      .populate('assignedToDepartment', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Report.countDocuments(filter);
    
    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    logger.error('getMyReports error: %s', err.message);
    next(err);
  }
};