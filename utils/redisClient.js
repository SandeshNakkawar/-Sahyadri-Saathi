const redis = require('redis');

// Redis client configuration
let redisClient = null;

/**
 * Initialize Redis connection
 */
const initRedis = async () => {
  // Check if Redis is explicitly disabled
  if (process.env.REDIS_ENABLED === 'false') {
    console.log('ℹ️  Redis is disabled (REDIS_ENABLED=false)');
    return null;
  }

  try {
    // Create Redis client
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000, // 5 second connection timeout
        reconnectStrategy: (retries) => {
          // Only try 3 times, then give up silently
          if (retries > 3) {
            return false; // Stop reconnecting
          }
          // Exponential backoff: 1s, 2s, 4s
          return Math.min(retries * 1000, 4000);
        }
      }
    });

    // Error handling - only log first error, then be silent
    let errorLogged = false;
    redisClient.on('error', (err) => {
      if (!errorLogged && err.code !== 'ECONNREFUSED') {
        // Only log non-connection errors (connection refused is expected if Redis isn't running)
        console.error('❌ Redis Client Error:', err.message);
        errorLogged = true;
      }
    });

    redisClient.on('connect', () => {
      console.log('🔄 Redis: Connecting...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis: Connected and ready');
    });

    // Connect to Redis with timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]);

    return redisClient;
  } catch (error) {
    // Only show message if Redis URL is explicitly set (user expects it to work)
    if (process.env.REDIS_URL) {
      console.log('⚠️  Redis connection failed (REDIS_URL set but Redis unavailable)');
      console.log('   Continuing without Redis (using in-memory fallback)');
    } else {
      // Silent fallback if Redis URL not set (Redis is optional)
      console.log('ℹ️  Redis not available (optional - using in-memory fallback)');
    }
    redisClient = null;
    return null;
  }
};

/**
 * Get Redis client instance
 */
const getRedisClient = () => {
  return redisClient;
};

/**
 * Check if Redis is available
 */
const isRedisAvailable = () => {
  return redisClient !== null && redisClient.isReady;
};

/**
 * Set a key-value pair with expiration (in seconds)
 */
const setWithExpiry = async (key, value, expirySeconds = 3600) => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    await redisClient.setEx(key, expirySeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Redis SET error:', error);
    return false;
  }
};

/**
 * Get value by key
 */
const get = async (key) => {
  if (!isRedisAvailable()) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
};

/**
 * Check if key exists
 */
const exists = async (key) => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const result = await redisClient.exists(key);
    return result === 1;
  } catch (error) {
    console.error('Redis EXISTS error:', error);
    return false;
  }
};

/**
 * Delete a key
 */
const del = async (key) => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis DEL error:', error);
    return false;
  }
};

/**
 * Set a key if it doesn't exist (atomic operation)
 * Returns true if key was set, false if it already exists
 */
const setIfNotExists = async (key, value, expirySeconds = 3600) => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    // Single atomic SET with NX + EX — no race between set and expire
    const result = await redisClient.set(key, JSON.stringify(value), {
      NX: true,  // Only set if key does NOT exist
      EX: expirySeconds  // Set expiry atomically
    });
    // result is 'OK' if set, null if key already exists
    return result === 'OK';
  } catch (error) {
    console.error('Redis SETNX error:', error);
    return false;
  }
};

/**
 * Close Redis connection
 */
const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('✅ Redis: Connection closed');
    } catch (error) {
      console.error('❌ Redis: Error closing connection:', error);
    }
  }
};

// ============================================
// QUERY CACHING UTILITIES
// ============================================

/**
 * Generate a cache key from model name and query parameters
 * This creates consistent, unique keys for different query combinations
 */
const generateCacheKey = (prefix, queryParams = {}) => {
  const sortedParams = Object.keys(queryParams)
    .sort()
    .reduce((acc, key) => {
      acc[key] = queryParams[key];
      return acc;
    }, {});
  return `${prefix}:${JSON.stringify(sortedParams)}`;
};

/**
 * Get cached data with prefix
 * Returns null if cache miss or Redis unavailable (graceful fallback)
 */
const getCache = async (cacheKey) => {
  if (!isRedisAvailable()) {
    return null; // Graceful fallback - proceed without cache
  }

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`📦 Cache HIT: ${cacheKey.substring(0, 50)}...`);
      return JSON.parse(cached);
    }
    console.log(`📭 Cache MISS: ${cacheKey.substring(0, 50)}...`);
    return null;
  } catch (error) {
    console.error('Redis cache get error:', error.message);
    return null; // Graceful fallback on error
  }
};

/**
 * Set cached data with TTL (Time To Live)
 * Default TTL: 5 minutes for query results
 */
const setCache = async (cacheKey, data, ttlSeconds = 300) => {
  if (!isRedisAvailable()) {
    return false; // Silent fail - caching is optional
  }

  try {
    await redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(data));
    console.log(`💾 Cache SET: ${cacheKey.substring(0, 50)}... (TTL: ${ttlSeconds}s)`);
    return true;
  } catch (error) {
    console.error('Redis cache set error:', error.message);
    return false; // Silent fail - don't break the app
  }
};

/**
 * Clear cache by pattern (e.g., all tour caches)
 * Uses SCAN for production-safe pattern deletion
 */
const clearCacheByPattern = async (pattern) => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    let cursor = 0;
    let deletedCount = 0;

    do {
      const result = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor;
      const keys = result.keys;

      if (keys.length > 0) {
        await redisClient.del(keys);
        deletedCount += keys.length;
      }
    } while (cursor !== 0);

    if (deletedCount > 0) {
      console.log(`🗑️  Cache CLEARED: ${deletedCount} keys matching "${pattern}"`);
    }
    return true;
  } catch (error) {
    console.error('Redis cache clear error:', error.message);
    return false;
  }
};

/**
 * Clear all caches for a specific model (e.g., 'tours', 'users')
 */
const clearModelCache = async (modelName) => {
  return clearCacheByPattern(`${modelName}:*`);
};

module.exports = {
  initRedis,
  getRedisClient,
  isRedisAvailable,
  setWithExpiry,
  get,
  exists,
  del,
  setIfNotExists,
  closeRedis,
  // Query caching exports
  generateCacheKey,
  getCache,
  setCache,
  clearCacheByPattern,
  clearModelCache
};

