const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient;
let redisEnabled = process.env.CACHE_ENABLED === 'true';

/**
 * Initialize the Redis client
 */
const initRedisClient = async () => {
  // Skip if Redis is explicitly disabled
  if (!redisEnabled) {
    logger.info('Redis caching is disabled via CACHE_ENABLED environment variable');
    return null;
  }

  try {
    if (!redisClient) {
      logger.info('Attempting to connect to Redis...');
      redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      redisClient.on('error', (err) => {
        logger.error('Redis Client Error', { error: err.message });
        redisEnabled = false; // Disable Redis if there's an error
      });

      try {
        await redisClient.connect();
        logger.info('Redis client connected successfully');
        redisEnabled = true;
      } catch (connectError) {
        logger.error('Redis connection failed, continuing without caching', { error: connectError.message });
        redisEnabled = false;
        redisClient = null;
        return null;
      }
    }
    return redisClient;
  } catch (error) {
    logger.error('Redis initialization failed', { error: error.message });
    redisEnabled = false;
    redisClient = null;
    return null;
  }
};

/**
 * Cache middleware using Redis
 * 
 * @param {number} expirationTime - Cache expiration time in seconds
 * @returns {function} - Express middleware
 */
const cache = (expirationTime = 300) => {
  return async (req, res, next) => {
    // Skip caching if Redis is disabled or not available
    if (!redisEnabled) {
      return next();
    }

    // Initialize Redis client if it doesn't exist
    if (!redisClient) {
      try {
        const client = await initRedisClient();
        if (!client) {
          return next();
        }
        redisClient = client;
      } catch (error) {
        logger.error('Failed to initialize Redis in cache middleware', { error: error.message });
        return next();
      }
    }

    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if user is authenticated (to ensure fresh data for logged-in users)
    if (req.user) {
      return next(); 
    }

    // Create a cache key from the request URL and query parameters
    const cacheKey = `cache:${req.originalUrl || req.url}`;

    try {
      // Try to get the cached response
      const cachedResponse = await redisClient.get(cacheKey);
      
      if (cachedResponse) {
        logger.debug('Cache hit', { key: cacheKey });
        const parsedResponse = JSON.parse(cachedResponse);
        return res.status(200).json(parsedResponse);
      }

      // If no cache, capture the response
      const originalSend = res.send;
      res.send = function(body) {
        // Only cache successful responses
        if (res.statusCode === 200) {
          try {
            if (body && redisEnabled && redisClient && redisClient.isReady) {
              redisClient.setEx(cacheKey, expirationTime, typeof body === 'string' ? body : JSON.stringify(body))
                .catch(err => {
                  logger.error('Error setting cache', { error: err.message, key: cacheKey });
                });
              logger.debug('Cache set', { key: cacheKey, expiration: expirationTime });
            }
          } catch (error) {
            logger.error('Error setting cache', { error: error.message, key: cacheKey });
          }
        }
        originalSend.call(this, body);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      next();
    }
  };
};

/**
 * Clear cache by pattern
 * 
 * @param {string} pattern - Cache key pattern to clear
 */
const clearCache = async (pattern) => {
  // Skip if Redis is disabled or not available
  if (!redisEnabled || !redisClient) {
    return;
  }

  try {
    // Get all keys matching the pattern
    const keys = await redisClient.keys(`cache:${pattern}*`);
    
    if (keys && keys.length > 0) {
      // Delete all matched keys
      await redisClient.del(keys);
      logger.info(`Cache cleared for pattern: ${pattern}`, { keysCleared: keys.length });
    }
  } catch (error) {
    logger.error('Error clearing cache', { error: error.message, pattern });
  }
};

module.exports = {
  cache,
  clearCache,
  initRedisClient
}; 