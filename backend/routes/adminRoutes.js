const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { assignReport } = require('../controllers/adminController');

router.put('/reports/:id/assign', protect, authorize('staff','admin'), assignReport);

module.exports = router;
