// backend/routes/opsRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { metricsJson } = require('../controllers/opsController');

router.get('/metrics', protect, authorize('staff', 'admin'), metricsJson);

module.exports = router;
