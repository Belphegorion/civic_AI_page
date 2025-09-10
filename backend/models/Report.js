const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: String,
  publicId: String,
  uploadedAt: { type: Date, default: Date.now },
  analysis: {
    labels: [String],
    confidence: Number,
    detectedIssues: [String]
  }
}, { _id: false });

const audioSchema = new mongoose.Schema({
  url: String,
  publicId: String,
  uploadedAt: { type: Date, default: Date.now },
  duration: Number, // in seconds
  transcription: String // Optional: speech-to-text result
}, { _id: false });

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 2000 },
  category: { 
    type: String,
    required: true,
    enum: ['pothole','streetlight','trash','graffiti','water_leak','tree_hazard','sidewalk','traffic_signal','noise','parking','animal_control','public_safety','other']
  },
  priority: { type: String, enum: ['low','medium','high','critical'], default: 'medium' },
  status: { type: String, enum: ['submitted','acknowledged','assigned','in_progress','resolved','closed','rejected'], default: 'submitted' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  address: {
    street: String, city: String, state: String, zipCode: String, formattedAddress: String
  },
  images: [imageSchema],
  audio: audioSchema,
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedToDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better query performance
reportSchema.index({ location: '2dsphere' });
reportSchema.index({ status: 1 });
reportSchema.index({ category: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ reportedBy: 1 });
reportSchema.index({ assignedToDepartment: 1 });
reportSchema.index({ status: 1, category: 1 }); // Compound index for filtering
reportSchema.index({ createdAt: -1, status: 1 }); // Compound index for sorting and filtering

reportSchema.pre('save', function(next){
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Report', reportSchema);
