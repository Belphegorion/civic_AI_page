// backend/routes/deadLetterRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { list, requeue } = require('../controllers/deadLetterController');

// Only staff/admin
router.get('/', protect, authorize('staff', 'admin'), list);
router.post('/:id/requeue', protect, authorize('staff', 'admin'), requeue);

module.exports = router;
