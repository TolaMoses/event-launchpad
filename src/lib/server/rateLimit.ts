// Simple in-memory rate limiter
// For production, use Redis or a dedicated rate limiting service

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of rateLimitStore.entries()) {
		if (entry.resetAt < now) {
			rateLimitStore.delete(key);
		}
	}
}, 5 * 60 * 1000);

export interface RateLimitConfig {
	maxRequests: number;
	windowMs: number;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: number;
}

/**
 * Check if a request is within rate limits
 * @param key - Unique identifier (e.g., user ID + action)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
	key: string,
	config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): RateLimitResult {
	const now = Date.now();
	const entry = rateLimitStore.get(key);

	// No entry or window expired - create new entry
	if (!entry || entry.resetAt < now) {
		const resetAt = now + config.windowMs;
		rateLimitStore.set(key, { count: 1, resetAt });
		return {
			allowed: true,
			remaining: config.maxRequests - 1,
			resetAt
		};
	}

	// Increment count
	entry.count++;

	// Check if limit exceeded
	if (entry.count > config.maxRequests) {
		return {
			allowed: false,
			remaining: 0,
			resetAt: entry.resetAt
		};
	}

	return {
		allowed: true,
		remaining: config.maxRequests - entry.count,
		resetAt: entry.resetAt
	};
}

/**
 * Reset rate limit for a key
 * @param key - Unique identifier
 */
export function resetRateLimit(key: string): void {
	rateLimitStore.delete(key);
}

/**
 * Get current rate limit status without incrementing
 * @param key - Unique identifier
 * @param config - Rate limit configuration
 * @returns Current status
 */
export function getRateLimitStatus(
	key: string,
	config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): RateLimitResult {
	const now = Date.now();
	const entry = rateLimitStore.get(key);

	if (!entry || entry.resetAt < now) {
		return {
			allowed: true,
			remaining: config.maxRequests,
			resetAt: now + config.windowMs
		};
	}

	return {
		allowed: entry.count < config.maxRequests,
		remaining: Math.max(0, config.maxRequests - entry.count),
		resetAt: entry.resetAt
	};
}
