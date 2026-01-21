/**
 * Single Redis Client for Entire Application
 * 
 * Purpose: Defense and abuse prevention, NOT a general cache
 * 
 * Uses:
 * - Rate limiting (mandatory)
 * - Nonce storage (wallet auth)
 * - Idempotency keys (prevent duplicates)
 * - Optional caching (phase 4+)
 */

import { Redis } from '@upstash/redis';

// Single Redis instance - all other files import from here
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

/**
 * Check if Redis is properly configured
 * Useful for graceful degradation in dev environments
 */
export const isRedisConfigured = (): boolean => {
  return !!(
    process.env.UPSTASH_REDIS_URL && 
    process.env.UPSTASH_REDIS_TOKEN
  );
};

/**
 * Test Redis connection
 * Call this during server startup to verify setup
 */
export async function testRedisConnection(): Promise<boolean> {
  if (!isRedisConfigured()) {
    console.warn('⚠️  Redis not configured - set UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN');
    return false;
  }

  try {
    const result = await redis.ping();
    if (result === 'PONG') {
      console.log('✅ Redis connected successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    return false;
  }
}
