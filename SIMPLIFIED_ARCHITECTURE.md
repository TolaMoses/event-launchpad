# Simplified Architecture - Practical Implementation

**Based on real-world feedback: Keep it simple, scale gradually**

---

## 🎯 Core Philosophy

1. **Supabase for Everything** - Your source of truth, use its strengths
2. **Redis for Defense** - Rate limiting, abuse prevention, nonces
3. **No Premature Optimization** - Cache only when proven needed
4. **Simplicity Over Abstraction** - Single Redis client, clear purposes

---

## 📁 SIMPLIFIED Directory Structure

```
src/
├── lib/
│   ├── core/                          # Business logic
│   │   ├── events/
│   │   │   ├── EventService.ts        # Event operations
│   │   │   └── types.ts
│   │   ├── tasks/
│   │   │   ├── TaskService.ts         # Task operations
│   │   │   ├── verifiers/             # Platform verifiers
│   │   │   │   ├── TwitterVerifier.ts
│   │   │   │   ├── DiscordVerifier.ts
│   │   │   │   └── TelegramVerifier.ts
│   │   │   └── types.ts
│   │   └── auth/
│   │       ├── AuthService.ts
│   │       └── WalletAuth.ts
│   │
│   ├── infrastructure/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Supabase client (browser)
│   │   │   ├── admin.ts               # Supabase admin (server)
│   │   │   └── queries/               # Reusable queries
│   │   │       ├── events.ts
│   │   │       ├── tasks.ts
│   │   │       └── users.ts
│   │   │
│   │   └── redis/                     # ⚡ SIMPLIFIED REDIS
│   │       ├── client.ts              # Single Redis client
│   │       ├── rateLimiter.ts         # Rate limiting (MANDATORY)
│   │       ├── idempotency.ts         # Prevent duplicates (IMPORTANT)
│   │       ├── nonces.ts              # Wallet auth nonces (NEEDED)
│   │       └── cache.ts               # Optional caching (PHASE 4+)
│   │
│   ├── server/
│   │   ├── middleware/
│   │   │   ├── auth.ts                # Auth middleware
│   │   │   ├── rateLimit.ts           # Rate limit middleware
│   │   │   └── validation.ts          # Input validation
│   │   └── utils/
│   │       └── apiResponse.ts
│   │
│   ├── shared/
│   │   ├── types/                     # ✅ Already created
│   │   │   └── index.ts
│   │   ├── errors/                    # ✅ Already created
│   │   │   └── index.ts
│   │   ├── validation/
│   │   │   └── schemas/               # Zod schemas
│   │   │       ├── event.schema.ts
│   │   │       ├── task.schema.ts
│   │   │       └── user.schema.ts
│   │   └── constants/
│   │       └── app.ts
│   │
│   └── presentation/
│       ├── components/
│       │   ├── ui/                    # Generic UI
│       │   ├── features/              # Feature components
│       │   └── layout/
│       ├── stores/
│       │   ├── auth.store.ts
│       │   └── events.store.ts
│       └── hooks/
│           └── useAuth.ts
│
└── routes/
    ├── api/
    │   └── v1/                        # Versioned API
    └── (app)/                         # User routes
```

---

## 🔧 PHASE 1: Security Foundation (Week 1-2)

### Step 1: Create Single Redis Client

**File**: `src/lib/infrastructure/redis/client.ts`
```typescript
import { Redis } from '@upstash/redis';

// Single Redis instance for entire app
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

// Helper to check if Redis is configured
export const isRedisConfigured = (): boolean => {
  return !!(process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN);
};
```

### Step 2: Rate Limiter (MANDATORY)

**File**: `src/lib/infrastructure/redis/rateLimiter.ts`
```typescript
import { redis } from './client';
import { RateLimitError } from '$lib/shared/errors';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export class RateLimiter {
  /**
   * Check rate limit using sliding window
   * @throws RateLimitError if limit exceeded
   */
  async check(
    key: string,
    config: RateLimitConfig = { maxRequests: 10, windowSeconds: 60 }
  ): Promise<void> {
    const { maxRequests, windowSeconds } = config;
    const count = await redis.incr(key);

    // Set TTL on first request
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (count > maxRequests) {
      const ttl = await redis.ttl(key);
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${ttl} seconds.`
      );
    }
  }

  /**
   * Get remaining requests
   */
  async getRemaining(
    key: string,
    maxRequests: number
  ): Promise<number> {
    const count = await redis.get<number>(key) || 0;
    return Math.max(0, maxRequests - count);
  }

  /**
   * Reset rate limit for a key (admin only)
   */
  async reset(key: string): Promise<void> {
    await redis.del(key);
  }
}

// Export singleton
export const rateLimiter = new RateLimiter();
```

### Step 3: Idempotency Keys (Prevent Double Submissions)

**File**: `src/lib/infrastructure/redis/idempotency.ts`
```typescript
import { redis } from './client';

export class IdempotencyGuard {
  /**
   * Check if operation was already performed
   * @returns true if this is first attempt, false if duplicate
   */
  async checkAndSet(
    key: string,
    ttlSeconds: number = 300
  ): Promise<boolean> {
    // Try to set key only if it doesn't exist
    const result = await redis.set(key, '1', {
      ex: ttlSeconds,
      nx: true // Only set if not exists
    });

    return result === 'OK';
  }

  /**
   * Mark operation as complete
   */
  async markComplete(key: string, ttlSeconds: number = 3600): Promise<void> {
    await redis.set(key, 'complete', { ex: ttlSeconds });
  }

  /**
   * Check if operation is complete
   */
  async isComplete(key: string): Promise<boolean> {
    const value = await redis.get(key);
    return value === 'complete';
  }

  /**
   * Remove idempotency key (for retry scenarios)
   */
  async remove(key: string): Promise<void> {
    await redis.del(key);
  }
}

// Export singleton
export const idempotencyGuard = new IdempotencyGuard();
```

### Step 4: Nonce Storage (Wallet Auth)

**File**: `src/lib/infrastructure/redis/nonces.ts`
```typescript
import { redis } from './client';

interface NonceData {
  nonce: string;
  message: string;
  createdAt: number;
}

export class NonceStore {
  private readonly TTL_SECONDS = 300; // 5 minutes

  /**
   * Store nonce for wallet authentication
   */
  async create(walletAddress: string, nonce: string, message: string): Promise<void> {
    const key = this.getKey(walletAddress);
    const data: NonceData = {
      nonce,
      message,
      createdAt: Date.now()
    };

    await redis.set(key, JSON.stringify(data), { ex: this.TTL_SECONDS });
  }

  /**
   * Get and consume nonce (one-time use)
   */
  async consume(walletAddress: string): Promise<NonceData | null> {
    const key = this.getKey(walletAddress);
    const data = await redis.get<string>(key);

    if (!data) return null;

    // Delete immediately (one-time use)
    await redis.del(key);

    return JSON.parse(data);
  }

  /**
   * Check if nonce exists (without consuming)
   */
  async exists(walletAddress: string): Promise<boolean> {
    const key = this.getKey(walletAddress);
    const exists = await redis.exists(key);
    return exists === 1;
  }

  private getKey(walletAddress: string): string {
    return `nonce:${walletAddress.toLowerCase()}`;
  }
}

// Export singleton
export const nonceStore = new NonceStore();
```

### Step 5: Optional Cache (PHASE 4+, NOT NOW)

**File**: `src/lib/infrastructure/redis/cache.ts`
```typescript
import { redis } from './client';

/**
 * OPTIONAL: Use only for proven read-heavy endpoints
 * DO NOT use in repositories initially
 */
export class SimpleCache {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    return await redis.get<T>(key);
  }

  /**
   * Set cached value with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    await redis.set(key, value, { ex: ttlSeconds });
  }

  /**
   * Invalidate cache
   */
  async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * Invalidate specific key
   */
  async delete(key: string): Promise<void> {
    await redis.del(key);
  }
}

// Export singleton (but don't use yet!)
export const simpleCache = new SimpleCache();
```

---

## 🛡️ PHASE 2: Apply Security (Week 2-3)

### Rate Limiting Middleware

**File**: `src/lib/server/middleware/rateLimit.ts`
```typescript
import type { RequestHandler } from '@sveltejs/kit';
import { rateLimiter, type RateLimitConfig } from '$lib/infrastructure/redis/rateLimiter';
import { isRedisConfigured } from '$lib/infrastructure/redis/client';

export function withRateLimit(
  keyFn: (event: any) => string,
  config?: RateLimitConfig
): RequestHandler {
  return async (event) => {
    // Skip if Redis not configured (dev environment)
    if (!isRedisConfigured()) {
      console.warn('Redis not configured, skipping rate limit');
      return;
    }

    const key = keyFn(event);
    await rateLimiter.check(key, config);
  };
}

// Common rate limit configs
export const RATE_LIMITS = {
  strict: { maxRequests: 5, windowSeconds: 60 },      // 5/min
  normal: { maxRequests: 10, windowSeconds: 60 },     // 10/min
  relaxed: { maxRequests: 30, windowSeconds: 60 },    // 30/min
  verification: { maxRequests: 10, windowSeconds: 60 }, // 10/min
  creation: { maxRequests: 5, windowSeconds: 3600 },   // 5/hour
};
```

### Validation Middleware

**File**: `src/lib/server/middleware/validation.ts`
```typescript
import { z } from 'zod';
import type { RequestHandler } from '@sveltejs/kit';
import { ValidationError } from '$lib/shared/errors';

export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid request data', { errors: error.errors });
    }
    throw error;
  }
}

export function withValidation<T extends z.ZodType>(
  schema: T,
  handler: (validated: z.infer<T>, event: any) => Promise<Response>
): RequestHandler {
  return async (event) => {
    const validated = await validateBody(event.request, schema);
    return await handler(validated, event);
  };
}
```

---

## 🎯 Practical Implementation Examples

### Example 1: Secure Twitter Verification Endpoint

**File**: `src/routes/api/v1/tasks/verify/twitter/+server.ts`
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rateLimiter, RATE_LIMITS } from '$lib/server/middleware/rateLimit';
import { idempotencyGuard } from '$lib/infrastructure/redis/idempotency';
import { validateBody } from '$lib/server/middleware/validation';
import { z } from 'zod';
import { TwitterVerifier } from '$lib/core/tasks/verifiers/TwitterVerifier';

const twitterVerifySchema = z.object({
  taskId: z.string().uuid(),
  eventId: z.string().uuid(),
  action: z.enum(['follow', 'like', 'retweet', 'quote']),
  targetUsername: z.string().optional(),
  tweetUrl: z.string().url().optional()
});

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Rate limit: 10 verifications per minute per user
  await rateLimiter.check(
    `twitter-verify:${locals.user.id}`,
    RATE_LIMITS.verification
  );

  // 2. Validate input
  const validated = await validateBody(request, twitterVerifySchema);

  // 3. Prevent duplicate verification
  const idempotencyKey = `verify:twitter:${validated.taskId}:${locals.user.id}`;
  const isFirstAttempt = await idempotencyGuard.checkAndSet(idempotencyKey, 60);
  
  if (!isFirstAttempt) {
    return json({ error: 'Verification already in progress' }, { status: 409 });
  }

  try {
    // 4. Verify action
    const verifier = new TwitterVerifier();
    const result = await verifier.verify(validated, locals.user.id);

    // 5. Mark as complete
    await idempotencyGuard.markComplete(idempotencyKey);

    return json({ success: true, data: result });
  } catch (error) {
    // Remove idempotency key on error to allow retry
    await idempotencyGuard.remove(idempotencyKey);
    throw error;
  }
};
```

### Example 2: Prevent Double Task Submission

**File**: `src/routes/api/v1/tasks/submit/+server.ts`
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rateLimiter, RATE_LIMITS } from '$lib/server/middleware/rateLimit';
import { idempotencyGuard } from '$lib/infrastructure/redis/idempotency';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { taskId, eventId, submission } = await request.json();

  // Rate limit
  await rateLimiter.check(
    `submit-task:${locals.user.id}`,
    RATE_LIMITS.normal
  );

  // Prevent double submission
  const idempotencyKey = `submit:${taskId}:${locals.user.id}`;
  const isFirstSubmission = await idempotencyGuard.checkAndSet(idempotencyKey, 3600);

  if (!isFirstSubmission) {
    // Check if already submitted in DB
    const { data: existing } = await supabaseAdmin
      .from('task_submissions')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', locals.user.id)
      .maybeSingle();

    if (existing) {
      return json({ error: 'Task already submitted' }, { status: 409 });
    }
  }

  // Submit task
  const { data, error } = await supabaseAdmin
    .from('task_submissions')
    .insert({
      task_id: taskId,
      event_id: eventId,
      user_id: locals.user.id,
      submission
    })
    .select()
    .single();

  if (error) throw error;

  return json({ success: true, data });
};
```

### Example 3: Wallet Auth with Nonces

**File**: `src/routes/api/auth/wallet/nonce/+server.ts`
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { nonceStore } from '$lib/infrastructure/redis/nonces';
import { randomBytes } from 'crypto';

export const POST: RequestHandler = async ({ request }) => {
  const { walletAddress } = await request.json();

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return json({ error: 'Invalid wallet address' }, { status: 400 });
  }

  const nonce = randomBytes(32).toString('hex');
  const message = `Sign this message to authenticate: ${nonce}`;

  await nonceStore.create(walletAddress, nonce, message);

  return json({ message });
};
```

**File**: `src/routes/api/auth/wallet/verify/+server.ts`
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { nonceStore } from '$lib/infrastructure/redis/nonces';
import { ethers } from 'ethers';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { walletAddress, signature } = await request.json();

  // Get and consume nonce (one-time use)
  const nonceData = await nonceStore.consume(walletAddress);

  if (!nonceData) {
    return json({ error: 'Nonce expired or not found' }, { status: 401 });
  }

  // Verify signature
  let recovered: string;
  try {
    recovered = ethers.verifyMessage(nonceData.message, signature).toLowerCase();
  } catch {
    return json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (recovered !== walletAddress.toLowerCase()) {
    return json({ error: 'Signature mismatch' }, { status: 401 });
  }

  // Create session (use Supabase auth)
  // ... your existing session logic

  return json({ success: true });
};
```

---

## 📊 When to Use Redis vs Supabase

### ✅ Use Redis For:
- **Rate limiting** (all endpoints)
- **Nonce storage** (wallet auth)
- **Idempotency** (prevent duplicates)
- **Short-lived flags** (in-progress operations)
- **Abuse prevention** (IP blocking, spam detection)

### ✅ Use Supabase For:
- **All business data** (events, tasks, users, submissions)
- **Source of truth** (always query Supabase for correctness)
- **Relationships** (foreign keys, joins)
- **Transactions** (multi-table updates)
- **Authorization** (RLS policies)
- **Realtime** (subscriptions)

### ❌ DON'T Cache in Redis Initially:
- User data
- Event data
- Task submissions
- Anything that changes frequently
- Anything that must be correct

### ⏳ Consider Redis Cache LATER For:
- **Public event list** (if >1000 events and read-heavy)
- **Leaderboards** (if >10k users)
- **Aggregate counts** (if complex queries slow)
- **Static content** (terms of service, FAQs)

---

## 🎯 Simplified Implementation Timeline

### Week 1: Redis Foundation (3 hours)
- [ ] Sign up for Upstash Redis (free tier)
- [ ] Create 4 Redis files (client, rateLimiter, idempotency, nonces)
- [ ] Create middleware files (rateLimit, validation)
- [ ] Test Redis connection

### Week 2: Apply to Critical Endpoints (6 hours)
- [ ] Add rate limiting to verification endpoints
- [ ] Add idempotency to submission endpoints
- [ ] Add nonce system to wallet auth
- [ ] Test each endpoint

### Week 3: Validation Schemas (4 hours)
- [ ] Create Zod schemas for events, tasks, users
- [ ] Apply validation to all API routes
- [ ] Test with invalid data

### Week 4: Error Handling (3 hours)
- [ ] Use custom errors everywhere
- [ ] Standardize error responses
- [ ] Update frontend error handling

**Total Phase 1: 16 hours over 4 weeks**

---

## 💰 Cost Reality Check

### Upstash Redis (Free Tier):
- 10,000 commands/day
- Sufficient for:
  - Rate limiting: ~5,000 requests/day
  - Idempotency: ~3,000 requests/day
  - Nonces: ~1,000 auth attempts/day
- **Cost**: $0/month

### Supabase (Free Tier):
- 500MB database
- 2GB bandwidth
- **Cost**: $0/month

**You can run this architecture for free until you have real traction.**

---

## 🎓 Key Takeaways

1. **Keep it simple** - Single Redis client, clear purposes
2. **Use Redis defensively** - Protect your system, don't over-optimize
3. **Trust Supabase** - It's designed for exactly what you're doing
4. **Cache later** - Only when you have proven performance issues
5. **Measure first** - Use Lighthouse, monitor logs, find real bottlenecks

**Redis is your shield, not your database.**

---

Ready to implement? Let's start with the Redis files! 🚀
