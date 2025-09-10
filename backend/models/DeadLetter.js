// backend/models/DeadLetter.js
const mongoose = require('mongoose');

const deadLetterSchema = new mongoose.Schema({
  jobId: { type: String },
  name: { type: String },
  data: { type: mongoose.Schema.Types.Mixed },
  failedReason: { type: String },
  attemptsMade: { type: Number },
  opts: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DeadLetter', deadLetterSchema);
