const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  keywords: [String],
  email: String,
  phone: String,
  createdAt: { type: Date, default: Date.now }
});

// Indexes for better query performance
departmentSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
