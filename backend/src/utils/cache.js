/**
 * Simple in-memory cache utility for performance optimization
 * Provides TTL (Time To Live) support and automatic cleanup
 */

class MemoryCache {
  constructor() {
    this.store = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.cleanupInterval = 60 * 1000; // Cleanup every minute
    
    // Start cleanup interval
    this.startCleanup();
  }
  
  /**
   * Set a value in cache with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.store.set(key, { value, expiresAt });
    return true;
  }
  
  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    return this.store.delete(key);
  }
  
  /**
   * Check if a key exists in cache (and is not expired)
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.store.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Clear all cache entries
   */
  clear() {
    this.store.clear();
  }
  
  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  stats() {
    const now = Date.now();
    let total = 0;
    let expired = 0;
    let active = 0;
    
    for (const [key, entry] of this.store.entries()) {
      total++;
      if (now > entry.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }
    
    return {
      total,
      active,
      expired,
      size: this.store.size
    };
  }
  
  /**
   * Start automatic cleanup of expired entries
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.cleanupInterval);
  }
  
  /**
   * Stop automatic cleanup
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  /**
   * Clean up expired entries
   */
  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
    }
  }
}

// Create singleton instance
const cache = new MemoryCache();

// Cache key generators for different data types
export const CacheKeys = {
  // Institute data
  institute: (id) => `institute:${id}`,
  instituteBySubdomain: (subdomain) => `institute:subdomain:${subdomain}`,
  instituteByDomain: (domain) => `institute:domain:${domain}`,
  
  // User data
  user: (id) => `user:${id}`,
  userByEmail: (email) => `user:email:${email.toLowerCase()}`,
  
  // Alumni profile data
  alumniProfile: (id) => `alumni:profile:${id}`,
  alumniProfileByUserId: (userId) => `alumni:profile:user:${userId}`,
  
  // Feed data
  feed: (instituteId, userId) => `feed:${instituteId}:${userId || 'public'}`,
  
  // Events
  events: (instituteId, filters = '') => `events:${instituteId}:${filters}`,
  
  // Jobs
  jobs: (instituteId, role = 'alumni') => `jobs:${instituteId}:${role}`,
  
  // Mentorship conversations
  mentorshipConversations: (userId) => `mentorship:conversations:${userId}`,
  
  // Notifications
  notifications: (userId, unreadOnly = false) => 
    `notifications:${userId}:${unreadOnly ? 'unread' : 'all'}`,
};

// Cache middleware for Express routes
export function cacheMiddleware(ttl = 300) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Generate cache key from URL and query params
    const cacheKey = `route:${req.originalUrl}`;
    
    // Check cache
    const cached = cache.get(cacheKey);
    
    if (cached) {
      // Set cache hit header
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    // Override res.json to cache response
    const originalJson = res.json;
    res.json = function(data) {
      // Cache successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, data, ttl * 1000);
        res.set('X-Cache', 'MISS');
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

// Helper function to invalidate cache by pattern
export function invalidateCache(pattern) {
  let cleared = 0;
  
  for (const key of cache.store.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      cleared++;
    }
  }
  
  return cleared;
}

// Export singleton instance
export default cache;