// backend/middleware/userRateLimiter.js
// Simple token-count windowed limiter using redis INCR + EXPIRE.
// - Uses app's redis client (req.app.get('redis')).
// - Keys are `rate:user:<id>:<window>` or `rate:ip:<ip>:<window>`
// - window computed as Math.floor(now / windowMs)
const config = require('../config');
const logger = require('../utils/logger');

const makeLimiter = ({ getIdentifier, windowMs, max }) => {
  return async (req, res, next) => {
    try {
      const redisClient = req.app.get('redis');
      if (!redisClient) {
        // if redis not available, allow through but log
        logger.warn('Redis client unavailable for rate limiter; allowing request');
        return next();
      }

      const identifier = await getIdentifier(req);
      const now = Date.now();
      const window = Math.floor(now / windowMs);
      const key = `rate:${identifier}:${window}`;

      // atomic increment; set TTL if first increment
      const count = await redisClient.incr(key);
      if (count === 1) {
        // set expiry so key auto-expires when window closes
        await redisClient.expire(key, Math.ceil(windowMs / 1000));
      }

      if (count > max) {
        res.status(429).json({ message: 'Too many requests; rate limit exceeded' });
        return;
      }

      // attach remaining quota info (optional)
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      next();
    } catch (err) {
      logger.error('userRateLimiter error: %s', err.message);
      // on error, allow request to avoid taking down service
      next();
    }
  };
};

// default user-key limiter for authenticated users (fallback to IP)
const userKeyLimiter = makeLimiter({
  getIdentifier: async (req) => {
    if (req.user && req.user._id) return `user:${req.user._id}`;
    // use ip fallback
    return `ip:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;
  },
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max
});

// create-report limiter (stricter)
const createReportLimiter = makeLimiter({
  getIdentifier: async (req) => {
    if (req.user && req.user._id) return `user:${req.user._id}`;
    return `ip:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;
  },
  windowMs: config.rateLimit.createReportWindowMs,
  max: config.rateLimit.createReportMax
});

module.exports = { userKeyLimiter, createReportLimiter };
