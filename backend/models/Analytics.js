const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  totalReports: { type: Number, default: 0 },
  avgResponseTimeHours: { type: Number, default: 0 },
  byCategory: { type: Map, of: Number },
});

module.exports = mongoose.model('Analytics', analyticsSchema);
