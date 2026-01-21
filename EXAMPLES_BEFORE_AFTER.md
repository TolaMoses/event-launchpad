# Before & After Examples - Simplified Architecture

This document shows exactly how to update your existing endpoints with the new simplified architecture.

---

## Example 1: Twitter Verification Endpoint

### ❌ BEFORE (`src/routes/api/tasks/verify-twitter/+server.ts`)

**Problems**:
- In-memory rate limiting (not production-ready)
- No idempotency (allows duplicate submissions)
- Manual validation
- 194 lines of mixed concerns

```typescript
// Lines 1-27: Retry logic
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  // ... retry logic
}

// Lines 29-97: Rate limiting + verification
const verificationAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const MAX_ATTEMPTS = 10;

export const POST: RequestHandler = async ({ request, locals }) => {
  // Manual validation
  const { taskId, eventId, username } = await request.json();
  
  // In-memory rate limit
  const userId = locals.user.id;
  const now = Date.now();
  const key = `${userId}:${taskId}`;
  const attempts = verificationAttempts.get(key);
  
  if (attempts && now < attempts.resetAt) {
    if (attempts.count >= MAX_ATTEMPTS) {
      throw error(429, 'Too many verification attempts');
    }
    attempts.count++;
  } else {
    verificationAttempts.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW
    });
  }
  
  // Direct DB query
  const { data: connection } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'twitter')
    .single();
    
  // ... verification logic
};
```

### ✅ AFTER (Simplified)

**Improvements**:
- Redis rate limiting (production-ready)
- Idempotency guard (prevents duplicates)
- Zod validation
- Only 60 lines

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rateLimiter, RATE_LIMITS } from '$lib/infrastructure/redis/rateLimiter';
import { idempotencyGuard } from '$lib/infrastructure/redis/idempotency';
import { validateBody } from '$lib/server/middleware/validation';
import { twitterVerificationSchema } from '$lib/shared/validation/schemas/task.schema';
import { TwitterVerifier } from '$lib/core/tasks/verifiers/TwitterVerifier';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Rate limit: 10 verifications per minute
  await rateLimiter.check(
    `twitter-verify:${locals.user.id}`,
    RATE_LIMITS.verification
  );

  // 2. Validate input
  const validated = await validateBody(request, twitterVerificationSchema);

  // 3. Prevent duplicate verification
  const idempotencyKey = idempotencyGuard.key.taskVerification(
    'twitter',
    validated.taskId,
    locals.user.id
  );
  
  const isFirstAttempt = await idempotencyGuard.checkAndSet(idempotencyKey, 60);
  if (!isFirstAttempt) {
    return json({ error: 'Verification already in progress' }, { status: 409 });
  }

  try {
    // 4. Verify action (business logic extracted to service)
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

**What to create**: `src/lib/core/tasks/verifiers/TwitterVerifier.ts` - Extract verification logic here

---

## Example 2: Predictions Endpoint

### ❌ BEFORE (`src/routes/api/predictions/+server.ts`)

**Problems**:
- No rate limiting
- Manual validation
- Complex update logic inline
- Type unsafe

```typescript
export const POST: RequestHandler = async ({ request, locals }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (err) {
    throw error(400, 'Invalid JSON payload');
  }

  // Manual validation
  const taskId = typeof body.taskId === 'string' ? body.taskId : '';
  const eventId = typeof body.eventId === 'string' ? body.eventId : '';
  const prediction = body.prediction;
  
  if (!taskId || !eventId || !prediction) {
    throw error(400, 'Missing required fields');
  }

  // Complex logic
  const { data: existing } = await supabaseAdmin
    .from('task_submissions')
    .select('id')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Update
    await supabaseAdmin
      .from('task_submissions')
      .update({ submission: prediction })
      .eq('id', existing.id);
  } else {
    // Insert
    await supabaseAdmin
      .from('task_submissions')
      .insert({
        task_id: taskId,
        user_id: userId,
        submission: prediction
      });
  }
};
```

### ✅ AFTER (Simplified)

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rateLimiter, RATE_LIMITS } from '$lib/infrastructure/redis/rateLimiter';
import { validateBody } from '$lib/server/middleware/validation';
import { predictionSchema } from '$lib/shared/validation/schemas/task.schema';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  await rateLimiter.check(
    `submit-prediction:${locals.user.id}`,
    RATE_LIMITS.normal
  );

  // Validate input
  const validated = await validateBody(request, predictionSchema);

  // Upsert prediction (PostgreSQL handles the logic)
  const { data, error } = await supabaseAdmin
    .from('task_submissions')
    .upsert({
      task_id: validated.taskId,
      event_id: validated.eventId,
      user_id: locals.user.id,
      submission: validated.prediction,
      referrer_id: validated.referrerId || null
    }, {
      onConflict: 'user_id,task_id'
    })
    .select()
    .single();

  if (error) throw error;

  return json({ success: true, data });
};
```

**Note**: You'll need to add a unique constraint to your database:
```sql
ALTER TABLE task_submissions
ADD CONSTRAINT unique_user_task UNIQUE (user_id, task_id);
```

---

## Example 3: Wallet Authentication

### ❌ BEFORE

**Problems**:
- In-memory nonce storage (lost on server restart)
- No nonce expiry
- Race conditions possible

```typescript
// In-memory storage
const nonces = new Map<string, { nonce: string; message: string }>();

// Nonce endpoint
export const POST: RequestHandler = async ({ request }) => {
  const { walletAddress } = await request.json();
  const nonce = randomBytes(32).toString('hex');
  const message = `Sign this: ${nonce}`;
  
  nonces.set(walletAddress, { nonce, message });
  
  return json({ message });
};

// Verify endpoint
export const POST: RequestHandler = async ({ request }) => {
  const { walletAddress, signature } = await request.json();
  
  const stored = nonces.get(walletAddress);
  if (!stored) {
    throw error(401, 'Nonce not found');
  }
  
  // Verify signature
  const recovered = ethers.verifyMessage(stored.message, signature);
  
  if (recovered !== walletAddress) {
    throw error(401, 'Invalid signature');
  }
  
  // Delete nonce (but could be used again if verification called twice)
  nonces.delete(walletAddress);
};
```

### ✅ AFTER (Simplified)

**Nonce Endpoint**: `src/routes/api/auth/wallet/nonce/+server.ts`
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { nonceStore } from '$lib/infrastructure/redis/nonces';
import { validateBody } from '$lib/server/middleware/validation';
import { walletConnectionSchema } from '$lib/shared/validation/schemas/user.schema';
import { randomBytes } from 'crypto';

export const POST: RequestHandler = async ({ request }) => {
  // Validate wallet address
  const { walletAddress } = await validateBody(request, walletConnectionSchema);

  // Generate nonce
  const nonce = randomBytes(32).toString('hex');
  const message = `Sign this message to authenticate with Phaeton:\n\nNonce: ${nonce}`;

  // Store in Redis (5 min TTL, auto-expires)
  await nonceStore.create(walletAddress, nonce, message);

  return json({ message });
};
```

**Verify Endpoint**: `src/routes/api/auth/wallet/verify/+server.ts`
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { nonceStore } from '$lib/infrastructure/redis/nonces';
import { rateLimiter, RATE_LIMITS } from '$lib/infrastructure/redis/rateLimiter';
import { validateBody } from '$lib/server/middleware/validation';
import { walletSignatureSchema } from '$lib/shared/validation/schemas/user.schema';
import { ethers } from 'ethers';

export const POST: RequestHandler = async ({ request, cookies }) => {
  // Rate limit auth attempts
  const { walletAddress } = await validateBody(request, walletSignatureSchema);
  
  await rateLimiter.check(
    `wallet-auth:${walletAddress}`,
    RATE_LIMITS.auth
  );

  // Get and consume nonce (atomic, one-time use)
  const nonceData = await nonceStore.consume(walletAddress);
  
  if (!nonceData) {
    return json({ error: 'Nonce expired or not found' }, { status: 401 });
  }

  // Verify signature
  const validated = await validateBody(request, walletSignatureSchema);
  
  let recovered: string;
  try {
    recovered = ethers.verifyMessage(nonceData.message, validated.signature).toLowerCase();
  } catch {
    return json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (recovered !== walletAddress.toLowerCase()) {
    return json({ error: 'Signature mismatch' }, { status: 401 });
  }

  // Create session using your existing Supabase auth
  // ... your session logic here

  return json({ success: true, userId: 'user-id-here' });
};
```

---

## Example 4: Event Creation

### ❌ BEFORE (`src/routes/api/events/+server.ts`)

```typescript
export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  
  // Manual validation
  const title = ensureString(body.title, 'title');
  const description = ensureString(body.description, 'description');
  
  // No rate limiting
  
  // Direct DB insert
  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      title,
      description,
      created_by: locals.user.id
    });
};
```

### ✅ AFTER (Simplified)

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rateLimiter, RATE_LIMITS } from '$lib/infrastructure/redis/rateLimiter';
import { validateBody } from '$lib/server/middleware/validation';
import { eventCreateSchema } from '$lib/shared/validation/schemas/event.schema';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 5 events per hour
  await rateLimiter.check(
    `create-event:${locals.user.id}`,
    RATE_LIMITS.creation
  );

  // Validate input (comprehensive validation)
  const validated = await validateBody(request, eventCreateSchema);

  // Insert event
  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      ...validated,
      created_by: locals.user.id,
      status: 'review' // Auto-set to review status
    })
    .select()
    .single();

  if (error) throw error;

  return json({ success: true, data }, { status: 201 });
};
```

---

## Summary of Changes

### Files Created:
1. ✅ `src/lib/infrastructure/redis/client.ts`
2. ✅ `src/lib/infrastructure/redis/rateLimiter.ts`
3. ✅ `src/lib/infrastructure/redis/idempotency.ts`
4. ✅ `src/lib/infrastructure/redis/nonces.ts`
5. ✅ `src/lib/server/middleware/rateLimit.ts`
6. ✅ `src/lib/server/middleware/validation.ts`
7. ✅ `src/lib/shared/validation/schemas/event.schema.ts`
8. ✅ `src/lib/shared/validation/schemas/task.schema.ts`
9. ✅ `src/lib/shared/validation/schemas/user.schema.ts`

### Next Steps (Your Tasks):

1. **Install dependencies**:
   ```bash
   npm install @upstash/redis zod
   ```

2. **Set up Upstash Redis**:
   - Go to https://upstash.com
   - Create free account
   - Create Redis database
   - Copy credentials to `.env`:
     ```
     UPSTASH_REDIS_URL=https://your-url.upstash.io
     UPSTASH_REDIS_TOKEN=your-token
     ```

3. **Test Redis connection**:
   ```typescript
   // In hooks.server.ts or any server file
   import { testRedisConnection } from '$lib/infrastructure/redis/client';
   await testRedisConnection(); // Should log "✅ Redis connected"
   ```

4. **Update endpoints one by one**:
   - Start with `/api/predictions` (easiest)
   - Then `/api/tasks/verify-twitter`
   - Then `/api/auth/wallet/*`
   - Then `/api/events`

5. **Test each endpoint**:
   - Try valid data → should work
   - Try invalid data → should get validation error
   - Try rapid requests → should get rate limited
   - Try duplicate submissions → should get 409 error

---

## Quick Migration Checklist

For each API endpoint:

- [ ] Add rate limiting at top of handler
- [ ] Add input validation with Zod schema
- [ ] Add idempotency for creation/submission endpoints
- [ ] Test with valid data
- [ ] Test with invalid data
- [ ] Test rate limiting
- [ ] Test duplicate prevention

**Estimated time per endpoint**: 15-30 minutes

**Total migration time** (20 endpoints): ~8-10 hours spread over 2 weeks

---

## Benefits You'll Get Immediately

1. **Security**: No more injection attacks, no more spam
2. **Type Safety**: Validated, typed data everywhere
3. **Production Ready**: Redis-based, works at scale
4. **User Experience**: Better error messages
5. **Maintainability**: Clear patterns to follow
6. **Performance**: Rate limiting protects your resources

---

Ready to start? Begin with the predictions endpoint - it's the simplest! 🚀
