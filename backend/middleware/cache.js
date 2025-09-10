// Redis caching middleware
const cache = (duration = 300) => { // 5 minutes default
  return async (req, res, next) => {
    const redisClient = req.app.get('redis');
    if (!redisClient) {
      return next(); // Skip caching if Redis not available
    }

    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      // If cache read fails, continue without cache
      console.warn('Cache read failed:', err.message);
    }

    // Store original res.json
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Cache the response
      if (redisClient) {
        redisClient.setex(key, duration, JSON.stringify(data)).catch(err => {
          console.warn('Cache write failed:', err.message);
        });
      }
      
      // Send response
      originalJson(data);
    };

    next();
  };
};

module.exports = { cache };
