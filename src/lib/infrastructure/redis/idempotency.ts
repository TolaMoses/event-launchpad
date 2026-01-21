/**
 * Idempotency Guard - Prevent Duplicate Operations
 * 
 * IMPORTANT: Use this to prevent:
 * - Double task submissions
 * - Duplicate verification attempts
 * - Repeated wallet auth attempts
 * - Race conditions in critical operations
 * 
 * Example:
 * ```ts
 * const key = `submit:${taskId}:${userId}`;
 * const isFirst = await idempotencyGuard.checkAndSet(key, 60);
 * if (!isFirst) {
 *   throw new Error('Already submitted');
 * }
 * ```
 */

import { redis, isRedisConfigured } from './client';

export class IdempotencyGuard {
  /**
   * Check if operation was already performed, and mark as in-progress
   * 
   * @param key - Unique operation identifier
   * @param ttlSeconds - How long to remember (default: 5 minutes)
   * @returns true if this is first attempt, false if duplicate
   */
  async checkAndSet(
    key: string,
    ttlSeconds: number = 300
  ): Promise<boolean> {
    if (!isRedisConfigured()) {
      // In dev without Redis, always allow (but warn)
      console.warn(`⚠️  Idempotency bypassed (Redis not configured): ${key}`);
      return true;
    }

    try {
      // Try to set key only if it doesn't exist (atomic operation)
      const result = await redis.set(key, 'in-progress', {
        ex: ttlSeconds,
        nx: true // Only set if not exists
      });

      // result will be 'OK' if key was set (first attempt)
      // result will be null if key already exists (duplicate)
      return result === 'OK';
    } catch (error) {
      console.error('Idempotency check error (allowing operation):', error);
      return true; // Fail open
    }
  }

  /**
   * Mark operation as complete (extends TTL to prevent retries)
   * 
   * @param key - Operation identifier
   * @param ttlSeconds - How long to remember completion (default: 1 hour)
   */
  async markComplete(
    key: string,
    ttlSeconds: number = 3600
  ): Promise<void> {
    if (!isRedisConfigured()) return;

    try {
      await redis.set(key, 'complete', { ex: ttlSeconds });
    } catch (error) {
      console.error('Error marking operation complete:', error);
    }
  }

  /**
   * Check if operation is complete (without consuming)
   */
  async isComplete(key: string): Promise<boolean> {
    if (!isRedisConfigured()) return false;

    try {
      const value = await redis.get<string>(key);
      return value === 'complete';
    } catch (error) {
      console.error('Error checking completion status:', error);
      return false;
    }
  }

  /**
   * Check if operation is in progress
   */
  async isInProgress(key: string): Promise<boolean> {
    if (!isRedisConfigured()) return false;

    try {
      const value = await redis.get<string>(key);
      return value === 'in-progress';
    } catch (error) {
      console.error('Error checking in-progress status:', error);
      return false;
    }
  }

  /**
   * Remove idempotency key (for retry scenarios)
   * 
   * Use case: Operation failed, allow user to retry
   */
  async remove(key: string): Promise<void> {
    if (!isRedisConfigured()) return;

    try {
      await redis.del(key);
    } catch (error) {
      console.error('Error removing idempotency key:', error);
    }
  }

  /**
   * Get TTL for an idempotency key
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
   * Create standardized idempotency keys
   */
  static key = {
    taskSubmission: (taskId: string, userId: string) => 
      `idempotency:submit:${taskId}:${userId}`,
    
    taskVerification: (platform: string, taskId: string, userId: string) => 
      `idempotency:verify:${platform}:${taskId}:${userId}`,
    
    eventCreation: (userId: string, timestamp: number) => 
      `idempotency:create-event:${userId}:${timestamp}`,
    
    walletAuth: (walletAddress: string, nonce: string) => 
      `idempotency:wallet-auth:${walletAddress}:${nonce}`,
    
    custom: (operation: string, ...identifiers: string[]) => 
      `idempotency:${operation}:${identifiers.join(':')}`,
  };
}

// Export singleton instance
export const idempotencyGuard = new IdempotencyGuard();
