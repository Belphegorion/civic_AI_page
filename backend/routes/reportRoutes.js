// backend/routes/reportRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { createReport, getReports, updateStatus, getDepartmentReports, getMyReports } = require('../controllers/reportController');

const router = express.Router();

const categories = [
  'pothole','streetlight','trash','graffiti','water_leak','tree_hazard',
  'sidewalk','traffic_signal','noise','parking','animal_control','public_safety','other'
];

// Validation middleware for createReport (multipart form fields are in req.body)
const validateCreateReport = [
  body('title').isString().isLength({ min: 5, max: 200 }).withMessage('title must be 5-200 chars'),
  body('description').isString().isLength({ min: 10, max: 2000 }).withMessage('description must be 10-2000 chars'),
  body('category').isIn(categories).withMessage('invalid category'),
  body('lng').exists().withMessage('lng is required').bail().isFloat({ min: -180, max: 180 }).withMessage('lng must be a valid longitude'),
  body('lat').exists().withMessage('lat is required').bail().isFloat({ min: -90, max: 90 }).withMessage('lat must be a valid latitude'),
  // optional address field; no strict validation
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Routes
router.post('/', protect, upload.fields([{ name: 'images', maxCount: 4 }, { name: 'audio', maxCount: 1 }]), validateCreateReport, createReport);
router.get('/', getReports); // Public access for viewing reports
router.get('/my', protect, getMyReports); // User's own reports
router.get('/department', protect, getDepartmentReports); // Department-specific reports
router.put('/:id/status', protect, authorize('admin', 'staff'), updateStatus);

module.exports = router;
