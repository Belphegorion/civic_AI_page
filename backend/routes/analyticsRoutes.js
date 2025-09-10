const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { cache } = require('../middleware/cache');
const { basicStats, detailedAnalytics } = require('../controllers/analyticsController');

router.get('/basic', protect, authorize('staff','admin'), cache(300), basicStats); // 5 minute cache
router.get('/detailed', protect, authorize('staff','admin'), cache(600), detailedAnalytics); // 10 minute cache

module.exports = router;
