/**
 * Rate Limiting Middleware
 * 
 * Apply to all API endpoints to prevent abuse
 * 
 * Usage:
 * ```ts
 * export const POST: RequestHandler = async (event) => {
 *   await withRateLimit('verify-twitter', (e) => e.locals.user.id)(event);
 *   // ... your logic
 * };
 * ```
 */

import type { RequestHandler } from '@sveltejs/kit';
import { rateLimiter, RATE_LIMITS, type RateLimitConfig } from '$lib/infrastructure/redis/rateLimiter';

/**
 * Create rate limit middleware
 * 
 * @param action - Action name for the rate limit key
 * @param keyFn - Function to extract unique identifier from event
 * @param config - Rate limit configuration (optional, defaults to normal)
 */
export function withRateLimit(
  action: string,
  keyFn: (event: any) => string,
  config?: RateLimitConfig
): RequestHandler {
  return async (event) => {
    const identifier = keyFn(event);
    const key = `ratelimit:${action}:${identifier}`;
    await rateLimiter.check(key, config);
  };
}

/**
 * Rate limit by user ID
 */
export function rateLimitByUser(
  action: string,
  config?: RateLimitConfig
): RequestHandler {
  return withRateLimit(
    action,
    (event) => event.locals.user?.id || 'anonymous',
    config
  );
}

/**
 * Rate limit by IP address
 */
export function rateLimitByIP(
  action: string,
  config?: RateLimitConfig
): RequestHandler {
  return withRateLimit(
    action,
    (event) => event.getClientAddress() || 'unknown',
    config
  );
}

/**
 * Rate limit by custom key function
 */
export function rateLimitBy(
  action: string,
  keyFn: (event: any) => string,
  config?: RateLimitConfig
): RequestHandler {
  return withRateLimit(action, keyFn, config);
}

// Common rate limit helpers
export const rateLimitHelpers = {
  /**
   * For verification endpoints (10/min)
   */
  verification: (userId: string) => 
    rateLimitByUser('verification', RATE_LIMITS.verification),

  /**
   * For creation endpoints (5/hour)
   */
  creation: (userId: string) => 
    rateLimitByUser('creation', RATE_LIMITS.creation),

  /**
   * For auth endpoints (5/5min)
   */
  auth: (identifier: string) => 
    withRateLimit('auth', () => identifier, RATE_LIMITS.auth),

  /**
   * Strict limits for sensitive operations
   */
  strict: (action: string) => 
    rateLimitByUser(action, RATE_LIMITS.strict),

  /**
   * Relaxed limits for read-heavy endpoints
   */
  relaxed: (action: string) => 
    rateLimitByUser(action, RATE_LIMITS.relaxed),
};
