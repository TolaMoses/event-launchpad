/**
 * Nonce Store - Wallet Authentication
 * 
 * NEEDED: For secure wallet-based authentication
 * 
 * Flow:
 * 1. User requests nonce
 * 2. Store nonce in Redis (5 min TTL)
 * 3. User signs message with nonce
 * 4. Verify signature, consume nonce (one-time use)
 * 5. Create session
 */

import { redis, isRedisConfigured } from './client';

export interface NonceData {
  nonce: string;
  message: string;
  createdAt: number;
}

export class NonceStore {
  private readonly TTL_SECONDS = 300; // 5 minutes
  private readonly KEY_PREFIX = 'nonce';

  /**
   * Create and store nonce for wallet authentication
   * 
   * @param walletAddress - User's wallet address
   * @param nonce - Random nonce string
   * @param message - Message to sign
   */
  async create(
    walletAddress: string,
    nonce: string,
    message: string
  ): Promise<void> {
    const key = this.getKey(walletAddress);
    const data: NonceData = {
      nonce,
      message,
      createdAt: Date.now()
    };

    if (!isRedisConfigured()) {
      console.warn(`⚠️  Nonce storage bypassed (Redis not configured): ${walletAddress}`);
      // In dev, could store in memory map, but for now just warn
      return;
    }

    try {
      await redis.set(key, JSON.stringify(data), { 
        ex: this.TTL_SECONDS 
      });
    } catch (error) {
      console.error('Error storing nonce:', error);
      throw new Error('Failed to create authentication challenge');
    }
  }

  /**
   * Get and consume nonce (one-time use)
   * 
   * @param walletAddress - User's wallet address
   * @returns Nonce data or null if expired/not found
   */
  async consume(walletAddress: string): Promise<NonceData | null> {
    if (!isRedisConfigured()) {
      console.warn(`⚠️  Nonce consumption bypassed (Redis not configured): ${walletAddress}`);
      return null;
    }

    const key = this.getKey(walletAddress);

    try {
      // Get the nonce data
      const data = await redis.get<string>(key);
      
      if (!data) {
        return null;
      }

      // Delete immediately to prevent reuse (atomic one-time use)
      await redis.del(key);

      // Parse and return
      const nonceData: NonceData = JSON.parse(data);

      // Validate nonce isn't too old (extra safety)
      const ageSeconds = (Date.now() - nonceData.createdAt) / 1000;
      if (ageSeconds > this.TTL_SECONDS) {
        return null;
      }

      return nonceData;
    } catch (error) {
      console.error('Error consuming nonce:', error);
      return null;
    }
  }

  /**
   * Check if nonce exists (without consuming)
   * 
   * @param walletAddress - User's wallet address
   */
  async exists(walletAddress: string): Promise<boolean> {
    if (!isRedisConfigured()) return false;

    try {
      const key = this.getKey(walletAddress);
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Error checking nonce existence:', error);
      return false;
    }
  }

  /**
   * Get nonce without consuming (for debugging only)
   */
  async peek(walletAddress: string): Promise<NonceData | null> {
    if (!isRedisConfigured()) return null;

    try {
      const key = this.getKey(walletAddress);
      const data = await redis.get<string>(key);
      
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (error) {
      console.error('Error peeking nonce:', error);
      return null;
    }
  }

  /**
   * Remove nonce manually (for cleanup)
   */
  async remove(walletAddress: string): Promise<void> {
    if (!isRedisConfigured()) return;

    try {
      const key = this.getKey(walletAddress);
      await redis.del(key);
    } catch (error) {
      console.error('Error removing nonce:', error);
    }
  }

  /**
   * Get TTL for a nonce
   */
  async getTTL(walletAddress: string): Promise<number> {
    if (!isRedisConfigured()) return 0;

    try {
      const key = this.getKey(walletAddress);
      return await redis.ttl(key);
    } catch (error) {
      console.error('Error getting nonce TTL:', error);
      return 0;
    }
  }

  /**
   * Generate Redis key for wallet address
   */
  private getKey(walletAddress: string): string {
    return `${this.KEY_PREFIX}:${walletAddress.toLowerCase()}`;
  }
}

// Export singleton instance
export const nonceStore = new NonceStore();
