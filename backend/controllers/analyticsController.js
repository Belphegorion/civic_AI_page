// backend/controllers/analyticsController.js
const Report = require('../models/Report');
const logger = require('../utils/logger');

exports.basicStats = async (req, res, next) => {
  try {
    const total = await Report.countDocuments();
    const byStatusAgg = await Report.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const byCategoryAgg = await Report.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    res.json({ total, byStatus: byStatusAgg, byCategory: byCategoryAgg });
  } catch (err) {
    logger.error('basicStats error: %s', err.message);
    next(err);
  }
};

exports.detailedAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    if (Object.keys(dateFilter).length > 0) {
      dateFilter.createdAt = dateFilter;
    }

    // Build department filter
    const deptFilter = department ? { assignedToDepartment: department } : {};

    const matchStage = { ...dateFilter, ...deptFilter };

    // Response time analytics
    const responseTimeStats = await Report.aggregate([
      { $match: matchStage },
      { $match: { status: { $in: ['resolved', 'closed'] } } },
      {
        $addFields: {
          responseTime: {
            $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' },
          minResponseTime: { $min: '$responseTime' },
          maxResponseTime: { $max: '$responseTime' },
          medianResponseTime: { $percentile: { input: '$responseTime', p: [0.5] } }
        }
      }
    ]);

    // Reports by priority
    const priorityStats = await Report.aggregate([
      { $match: matchStage },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Reports by department
    const departmentStats = await Report.aggregate([
      { $match: matchStage },
      { $lookup: { from: 'departments', localField: 'assignedToDepartment', foreignField: '_id', as: 'department' } },
      { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$department.name', count: { $sum: 1 } } }
    ]);

    // Monthly trends
    const monthlyTrends = await Report.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Resolution rate by department
    const resolutionRates = await Report.aggregate([
      { $match: matchStage },
      { $lookup: { from: 'departments', localField: 'assignedToDepartment', foreignField: '_id', as: 'department' } },
      { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$department.name',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          resolutionRate: { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] }
        }
      }
    ]);

    res.json({
      responseTime: responseTimeStats[0] || {},
      priorityStats,
      departmentStats,
      monthlyTrends,
      resolutionRates,
      period: { startDate, endDate }
    });
  } catch (err) {
    logger.error('detailedAnalytics error: %s', err.message);
    next(err);
  }
};
