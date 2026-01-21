# Implementation Checklist - Simplified Architecture

## ✅ Completed

### Phase 1: Foundation Setup
- [x] Redis account created (Upstash)
- [x] Environment variables configured
- [x] Created Redis client (`client.ts`)
- [x] Created RateLimiter (`rateLimiter.ts`)
- [x] Created IdempotencyGuard (`idempotency.ts`)
- [x] Created NonceStore (`nonces.ts`)
- [x] Created middleware (`rateLimit.ts`, `validation.ts`)
- [x] Created validation schemas (event, task, user)
- [x] Updated shared types (removed event_type, added reward_types)

## 📋 Next Steps

### Step 1: Install Dependencies & Test (5 minutes)
```bash
npm install @upstash/redis zod
npm run dev
```

Test Redis connection in browser console or add to `hooks.server.ts`:
```typescript
import { testRedisConnection } from '$lib/infrastructure/redis/client';
await testRedisConnection(); // Should log "✅ Redis connected"
```

### Step 2: Update First Endpoint - Predictions (20 minutes)

**File**: `src/routes/api/predictions/+server.ts`

Apply the pattern:
1. Add rate limiting
2. Add validation
3. Clean up logic

**Status**: Ready to implement ⬇️

### Step 3: Update Verification Endpoints (2-3 hours)

- [ ] `src/routes/api/tasks/verify-twitter/+server.ts`
  - Add rate limiting
  - Add idempotency guard
  - Add validation
  
- [ ] `src/routes/api/tasks/verify-discord/+server.ts`
  - Same pattern
  
- [ ] `src/routes/api/tasks/verify-telegram/+server.ts`
  - Same pattern

### Step 4: Update Task Submissions (1 hour)

- [ ] `src/routes/api/tasks/submit/+server.ts` (if exists)
  - Add idempotency
  - Add validation

### Step 5: Update Wallet Auth (1 hour)

- [ ] Create `src/routes/api/auth/wallet/nonce/+server.ts`
  - Use NonceStore
  
- [ ] Create `src/routes/api/auth/wallet/verify/+server.ts`
  - Use NonceStore
  - Verify signature
  - Rate limit

### Step 6: Update Event Creation (30 minutes)

- [ ] `src/routes/api/events/+server.ts`
  - Add rate limiting (5/hour)
  - Add validation with new schema
  - Update to use `reward_types` instead of `rewards`

### Step 7: Critical Bug Fix (30 minutes)

- [ ] Fix duplicate task registry
  - Consolidate `src/lib/tasks/index.ts` and `src/lib/tasks/taskRegistry.ts`
  - Update all imports

## 🎯 Success Criteria

After completion:

- [ ] All endpoints have rate limiting
- [ ] All inputs validated with Zod
- [ ] Can't submit invalid data (get 422 error)
- [ ] Can't spam requests (get 429 error)
- [ ] Can't submit duplicates (get 409 error)
- [ ] Wallet auth uses Redis nonces
- [ ] No TypeScript errors
- [ ] Application works as before (no regressions)

## 📊 Progress Tracking

**Week 1 Goals**:
- [x] Setup (Day 1)
- [ ] First endpoint (Day 1-2)
- [ ] Verification endpoints (Day 3-4)
- [ ] Test everything (Day 5)

**Week 2 Goals**:
- [ ] Task submissions
- [ ] Wallet auth
- [ ] Event creation
- [ ] Final testing

## 🔍 Testing Checklist

For each updated endpoint, test:

1. **Valid request** → Should work ✓
2. **Invalid data** → Should get validation error (422)
3. **Rapid requests** → Should get rate limited (429)
4. **Duplicate submission** → Should get conflict (409)
5. **No auth** → Should get unauthorized (401)

## 📝 Notes

**Remember**:
- Redis is for DEFENSE, not caching (yet)
- Supabase is your source of truth
- Add caching only in Phase 4+ if needed
- Test after each endpoint update

**If stuck**:
- Check `EXAMPLES_BEFORE_AFTER.md`
- Check `SIMPLIFIED_ARCHITECTURE.md`
- Existing lints in Svelte files are pre-existing (not urgent)

---

**Current Status**: Foundation complete, ready for endpoint migration 🚀
