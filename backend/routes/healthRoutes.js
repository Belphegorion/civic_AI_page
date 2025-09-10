// backend/routes/healthRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const { reportQueue } = require('../queues/queues');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState; // 1 = connected
    let queueCounts = {};
    try {
      queueCounts = await reportQueue.getJobCounts();
    } catch (e) {
      queueCounts = { error: e.message };
    }

    const redisClient = req.app.get('redis');
    const redisState = redisClient ? (redisClient.isOpen ? 'connected' : 'disconnected') : 'unknown';

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      dbState,
      redisState,
      queues: queueCounts,
      uptimeSeconds: process.uptime()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

module.exports = router;
