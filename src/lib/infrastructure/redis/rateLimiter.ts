/**
 * Rate Limiter - Redis-based (Production Ready)
 * 
 * MANDATORY: Use this for all API endpoints to prevent abuse
 * 
 * Examples:
 * - Verification endpoints: 10 requests/minute
 * - Creation endpoints: 5 requests/hour
 * - General endpoints: 30 requests/minute
 */

import { redis, isRedisConfigured } from './client';
import { RateLimitError } from '$lib/shared/errors';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

// Common rate limit configurations
export const RATE_LIMITS = {
  strict: { maxRequests: 5, windowSeconds: 60 },       // 5/min - for sensitive operations
  normal: { maxRequests: 10, windowSeconds: 60 },      // 10/min - default
  relaxed: { maxRequests: 30, windowSeconds: 60 },     // 30/min - for read-heavy endpoints
  verification: { maxRequests: 10, windowSeconds: 60 }, // 10/min - task verification
  creation: { maxRequests: 5, windowSeconds: 3600 },   // 5/hour - event creation
  auth: { maxRequests: 5, windowSeconds: 300 },        // 5/5min - auth attempts
};

export class RateLimiter {
  /**
   * Check rate limit using sliding window
   * @param key - Unique identifier (e.g., `verify:${userId}`)
   * @param config - Rate limit configuration
   * @throws RateLimitError if limit exceeded
   */
  async check(
    key: string,
    config: RateLimitConfig = RATE_LIMITS.normal
  ): Promise<void> {
    // Skip in dev if Redis not configured
    if (!isRedisConfigured()) {
      console.warn(`⚠️  Rate limit bypassed (Redis not configured): ${key}`);
      return;
    }

    const { maxRequests, windowSeconds } = config;
    
    try {
      // Increment counter atomically
      const count = await redis.incr(key);

      // Set TTL on first request
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      // Check if limit exceeded
      if (count > maxRequests) {
        const ttl = await redis.ttl(key);
        throw new RateLimitError(
          `Too many requests. Try again in ${ttl} seconds.`,
          {
            limit: maxRequests,
            window: windowSeconds,
            resetIn: ttl
          }
        );
      }
    } catch (error) {
      // If it's our RateLimitError, re-throw it
      if (error instanceof RateLimitError) {
        throw error;
      }
      
      // For other errors (Redis down, etc.), log and allow request
      // This ensures your app doesn't break if Redis has issues
      console.error('Rate limiter error (allowing request):', error);
    }
  }

  /**
   * Get remaining requests for a key
   */
  async getRemaining(
    key: string,
    maxRequests: number
  ): Promise<number> {
    if (!isRedisConfigured()) return maxRequests;

    try {
      const count = await redis.get<number>(key) || 0;
      return Math.max(0, maxRequests - count);
    } catch (error) {
      console.error('Error getting remaining requests:', error);
      return maxRequests; // Fail open
    }
  }

  /**
   * Get TTL for a rate limit key
   */
  async getTTL(key: string): Promise<number> {
    if (!isRedisConfigured()) return 0;

    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error('Error getting TTL:', error);
      return 0;
    }
  }

  /**
   * Reset rate limit for a key (admin only)
   */
  async reset(key: string): Promise<void> {
    if (!isRedisConfigured()) return;

    try {
      await redis.del(key);
    } catch (error) {
      console.error('Error resetting rate limit:', error);
    }
  }

  /**
   * Create a rate limit key from user ID
   */
  static userKey(userId: string, action: string): string {
    return `ratelimit:${action}:${userId}`;
  }

  /**
   * Create a rate limit key from IP address
   */
  static ipKey(ip: string, action: string): string {
    return `ratelimit:${action}:${ip}`;
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();
