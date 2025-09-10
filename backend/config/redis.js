const Redis = require('redis');

const createRedisClient = async () => {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = Redis.createClient({ url });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();
  return client;
};

module.exports = { createRedisClient };
