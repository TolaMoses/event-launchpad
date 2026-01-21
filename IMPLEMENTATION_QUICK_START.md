# Implementation Quick Start Guide
## Get Started in 30 Minutes

This guide helps you start implementing the restructure **immediately** with copy-paste examples.

---

## 🚀 Phase 1: Security (Start Here - Week 1)

### Step 1: Install Dependencies (5 minutes)

```bash
npm install @upstash/redis zod isomorphic-dompurify
npm install -D @types/dompurify
```

### Step 2: Set Up Environment (5 minutes)

Add to `.env`:
```bash
# Redis (Sign up at https://upstash.com - free tier available)
UPSTASH_REDIS_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_TOKEN=your-token-here

# Optional: Error tracking
SENTRY_DSN=your-sentry-dsn
```

### Step 3: Create Validation Schemas (10 minutes)

Create these files by copying the code below:

**File**: `src/lib/shared/validation/schemas/event.schema.ts`
```typescript
import { z } from 'zod';

export const eventCreateSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters')
    .trim(),
  
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description too long')
    .trim(),
  
  start_time: z.string()
    .datetime('Invalid start time format'),
  
  end_time: z.string()
    .datetime('Invalid end time format'),
  
  num_winners: z.number()
    .int()
    .positive()
    .optional()
    .nullable(),
  
  assets: z.object({
    logo: z.object({
      path: z.string(),
      publicUrl: z.string().url()
    }),
    banner: z.object({
      path: z.string(),
      publicUrl: z.string().url()
    }).optional()
  }),
  
  tasks: z.array(z.object({
    id: z.string(),
    type: z.enum(['twitter', 'discord', 'telegram', 'quiz', 'puzzle', 'referral', 'content_submission', 'scoreline_prediction', 'code_entry']),
    config: z.record(z.any()) // We'll validate config based on type
  })).min(1, 'At least one task required'),
  
  rewards: z.array(z.object({
    type: z.string(),
    // Add specific reward validation
  })).min(1, 'At least one reward required')
}).refine(data => {
  const start = new Date(data.start_time);
  const end = new Date(data.end_time);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['end_time']
});

export const taskSubmissionSchema = z.object({
  task_id: z.string().uuid(),
  event_id: z.string().uuid(),
  submission: z.record(z.any()),
  referrer_id: z.string().uuid().optional().nullable()
});

export const predictionSchema = z.object({
  taskId: z.string(),
  eventId: z.string(),
  prediction: z.object({
    home_score: z.number().int().min(0).max(99),
    away_score: z.number().int().min(0).max(99)
  }),
  referrerId: z.string().optional().nullable()
});
```

**File**: `src/lib/shared/validation/schemas/user.schema.ts`
```typescript
import { z } from 'zod';

export const walletAddressSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and dashes');
```

### Step 4: Create Validation Middleware (5 minutes)

**File**: `src/lib/server/middleware/validation.middleware.ts`
```typescript
import { z } from 'zod';
import type { RequestHandler } from '@sveltejs/kit';
import { ValidationError } from '$lib/shared/errors';

export function withValidation<T extends z.ZodType>(
  schema: T,
  handler: (validated: z.infer<T>, event: any) => Promise<Response>
): RequestHandler {
  return async (event) => {
    try {
      const body = await event.request.json();
      const validated = schema.parse(body);
      return await handler(validated, event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Validation failed',
          { errors: error.errors }
        );
      }
      throw error;
    }
  };
}

// Simpler version for quick use
export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  const body = await request.json();
  return schema.parse(body);
}
```

### Step 5: Apply to Your First API Route (5 minutes)

**Update**: `src/routes/api/predictions/+server.ts`

**Before**:
```typescript
export const POST: RequestHandler = async ({ request, locals }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (err) {
    throw error(400, 'Invalid JSON payload');
  }
  
  const taskId = typeof body.taskId === 'string' ? body.taskId : '';
  const eventId = typeof body.eventId === 'string' ? body.eventId : '';
  // ... manual validation
```

**After**:
```typescript
import { validateBody } from '$lib/server/middleware/validation.middleware';
import { predictionSchema } from '$lib/shared/validation/schemas/event.schema';
import { formatErrorResponse } from '$lib/shared/errors';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      throw new UnauthorizedError();
    }

    // Validate input - throws ValidationError if invalid
    const validated = await validateBody(request, predictionSchema);
    
    // Input is now guaranteed to be valid
    const { taskId, eventId, prediction, referrerId } = validated;
    
    // ... rest of your logic
    
  } catch (error) {
    console.error('Prediction error:', error);
    const response = formatErrorResponse(error);
    return json(response.error, { 
      status: error instanceof ApiError ? error.statusCode : 500 
    });
  }
};
```

---

## 📊 Phase 2: Rate Limiting (Week 3)

### Step 1: Create Rate Limiter

**File**: `src/lib/infrastructure/security/RateLimiter.ts`
```typescript
import { Redis } from '@upstash/redis';
import { RateLimitError } from '$lib/shared/errors';

export class RateLimiter {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!
    });
  }

  /**
   * Check rate limit for a key
   * @param key - Unique identifier (e.g., `verify:${userId}`)
   * @param maxRequests - Maximum requests allowed
   * @param windowSeconds - Time window in seconds
   */
  async check(
    key: string,
    maxRequests: number = 10,
    windowSeconds: number = 60
  ): Promise<void> {
    const count = await this.redis.incr(key);
    
    // Set expiration on first request
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    // Check if limit exceeded
    if (count > maxRequests) {
      const ttl = await this.redis.ttl(key);
      throw new RateLimitError(
        `Too many requests. Try again in ${ttl} seconds.`
      );
    }
  }

  async getRemaining(key: string, maxRequests: number): Promise<number> {
    const count = await this.redis.get<number>(key) || 0;
    return Math.max(0, maxRequests - count);
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
```

### Step 2: Apply to API Route

**Update**: `src/routes/api/tasks/verify-twitter/+server.ts`

Add at the top:
```typescript
import { RateLimiter } from '$lib/infrastructure/security/RateLimiter';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw new UnauthorizedError();
  }

  // Rate limit: 10 verifications per minute per user
  const limiter = new RateLimiter();
  await limiter.check(`twitter-verify:${locals.user.id}`, 10, 60);

  // Rest of your logic...
```

---

## 🗄️ Phase 3: Repository Pattern (Week 5)

### Step 1: Create Event Repository

**File**: `src/lib/infrastructure/database/repositories/EventRepository.ts`
```typescript
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import type { Event, EventFilters } from '$lib/shared/types';
import { EventNotFoundError, mapSupabaseError } from '$lib/shared/errors';

export class EventRepository {
  /**
   * Find event by ID
   */
  async findById(id: string, userId?: string): Promise<Event> {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select(`
        *,
        creator:users!created_by (
          id,
          username,
          wallet_address
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw mapSupabaseError(error);
    if (!data) throw new EventNotFoundError(id);

    return data as Event;
  }

  /**
   * List all active events
   */
  async findAll(filters?: EventFilters): Promise<Event[]> {
    let query = supabaseAdmin
      .from('events')
      .select('*, creator:users!created_by(username, wallet_address)');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.event_type) {
      query = query.eq('event_type', filters.event_type);
    }

    query = query.order('start_time', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw mapSupabaseError(error);
    return data as Event[];
  }

  /**
   * Create new event
   */
  async create(event: Partial<Event>, userId: string): Promise<Event> {
    const { data, error } = await supabaseAdmin
      .from('events')
      .insert({
        ...event,
        created_by: userId,
        status: 'review'
      })
      .select()
      .single();

    if (error) throw mapSupabaseError(error);
    return data as Event;
  }

  /**
   * Update event
   */
  async update(id: string, updates: Partial<Event>): Promise<Event> {
    const { data, error } = await supabaseAdmin
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw mapSupabaseError(error);
    if (!data) throw new EventNotFoundError(id);
    return data as Event;
  }

  /**
   * Check if user has joined event
   */
  async hasUserJoined(eventId: string, userId: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    return !!data;
  }

  /**
   * Get user's task submissions for event
   */
  async getUserSubmissions(eventId: string, userId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('task_submissions')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) throw mapSupabaseError(error);
    return data || [];
  }
}

// Export singleton
export const eventRepository = new EventRepository();
```

### Step 2: Use Repository in API Route

**Update**: `src/routes/api/events/+server.ts`

**Before**:
```typescript
const { data: eventData, error: eventError } = await supabaseAdmin
  .from('events')
  .select('*')
  .eq('id', eventId)
  .single();
```

**After**:
```typescript
import { eventRepository } from '$lib/infrastructure/database/repositories/EventRepository';

const event = await eventRepository.findById(eventId, locals.user?.id);
```

---

## 🎨 Phase 4: Component Extraction (Week 9)

### Step 1: Extract Event Header Component

**File**: `src/lib/presentation/components/features/events/EventHeader.svelte`
```svelte
<script lang="ts">
  import type { Event } from '$lib/shared/types';
  
  export let event: Event;
  
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  $: eventEnded = new Date(event.end_time) < new Date();
  $: eventStarted = new Date(event.start_time) < new Date();
</script>

<div class="event-header">
  {#if event.banner_url}
    <div class="banner">
      <img src={event.banner_url} alt="{event.title} banner" />
    </div>
  {/if}
  
  <div class="header-content">
    <div class="title-section">
      {#if event.logo_url}
        <img src={event.logo_url} alt="{event.title} logo" class="logo" />
      {/if}
      <div>
        <h1>{event.title}</h1>
        <div class="status-badges">
          {#if eventEnded}
            <span class="badge badge-ended">Ended</span>
          {:else if eventStarted}
            <span class="badge badge-live">Live</span>
          {:else}
            <span class="badge badge-upcoming">Upcoming</span>
          {/if}
          <span class="badge badge-type">{event.event_type}</span>
        </div>
      </div>
    </div>
    
    <p class="description">{event.description}</p>
    
    <div class="event-meta">
      <div class="meta-item">
        <span class="label">Starts</span>
        <span class="value">{formatDate(event.start_time)}</span>
      </div>
      <div class="meta-item">
        <span class="label">Ends</span>
        <span class="value">{formatDate(event.end_time)}</span>
      </div>
      {#if event.num_winners}
        <div class="meta-item">
          <span class="label">Winners</span>
          <span class="value">{event.num_winners}</span>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .event-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 2rem;
  }
  
  .banner img {
    width: 100%;
    height: 300px;
    object-fit: cover;
  }
  
  .header-content {
    padding: 2rem;
    color: white;
  }
  
  .title-section {
    display: flex;
    gap: 1.5rem;
    align-items: start;
    margin-bottom: 1rem;
  }
  
  .logo {
    width: 80px;
    height: 80px;
    border-radius: 12px;
    object-fit: cover;
    border: 3px solid rgba(255, 255, 255, 0.3);
  }
  
  h1 {
    font-size: 2.5rem;
    margin: 0 0 0.5rem;
  }
  
  .status-badges {
    display: flex;
    gap: 0.5rem;
  }
  
  .badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .badge-live {
    background: #10b981;
    color: white;
  }
  
  .badge-ended {
    background: #6b7280;
    color: white;
  }
  
  .badge-upcoming {
    background: #3b82f6;
    color: white;
  }
  
  .badge-type {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
  
  .description {
    font-size: 1.125rem;
    line-height: 1.6;
    margin: 1rem 0 2rem;
    opacity: 0.95;
  }
  
  .event-meta {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
  }
  
  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .label {
    font-size: 0.875rem;
    opacity: 0.8;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .value {
    font-size: 1.125rem;
    font-weight: 600;
  }
  
  @media (max-width: 768px) {
    h1 {
      font-size: 1.75rem;
    }
    
    .title-section {
      flex-direction: column;
      gap: 1rem;
    }
    
    .header-content {
      padding: 1.5rem;
    }
  }
</style>
```

### Step 2: Use in Page

**Update**: `src/routes/(app)/events/[id]/+page.svelte`

**Replace** the entire event header section with:
```svelte
<script lang="ts">
  import EventHeader from '$lib/presentation/components/features/events/EventHeader.svelte';
  
  export let data;
  $: ({ event } = data);
</script>

<EventHeader {event} />

<!-- Rest of your page... -->
```

---

## 📈 Quick Wins Checklist

Use this to track your progress:

### Week 1: Validation
- [ ] Install dependencies
- [ ] Create validation schemas
- [ ] Apply to `/api/predictions`
- [ ] Apply to `/api/events`
- [ ] Apply to `/api/tasks/*`
- [ ] Test with invalid data

### Week 2: Error Handling
- [ ] Use custom errors everywhere
- [ ] Replace all `throw error()` with custom errors
- [ ] Add try-catch to all API routes
- [ ] Use `formatErrorResponse()`
- [ ] Test error responses

### Week 3: Rate Limiting
- [ ] Set up Upstash Redis account
- [ ] Add credentials to `.env`
- [ ] Create RateLimiter class
- [ ] Apply to verification endpoints
- [ ] Apply to creation endpoints
- [ ] Test rate limit behavior

### Week 4: Repository Pattern
- [ ] Create EventRepository
- [ ] Create TaskRepository
- [ ] Create UserRepository
- [ ] Replace direct Supabase calls
- [ ] Test all queries

### Week 5: Component Extraction
- [ ] Extract EventHeader
- [ ] Extract TaskCard
- [ ] Extract TaskList
- [ ] Update event detail page
- [ ] Test all components

---

## 🎯 Success Criteria

After completing the quick start (Weeks 1-5):

**Code Quality**:
- ✅ All API routes have input validation
- ✅ Custom errors used everywhere
- ✅ No direct Supabase calls in routes
- ✅ Event detail page < 200 lines
- ✅ No duplicate code

**Security**:
- ✅ XSS attacks blocked
- ✅ SQL injection prevented
- ✅ Rate limiting active
- ✅ Input sanitization working

**Performance**:
- ✅ Page load < 2s
- ✅ API response < 500ms
- ✅ No unnecessary re-renders

---

## 🆘 Troubleshooting

### "Module not found: @upstash/redis"
```bash
# Make sure you installed it:
npm install @upstash/redis

# Clear cache and reinstall:
rm -rf node_modules package-lock.json
npm install
```

### "ValidationError is not defined"
```typescript
// Add import at top of file:
import { ValidationError } from '$lib/shared/errors';
```

### "Redis connection failed"
```bash
# Check your .env file has correct values
# Test connection:
node -e "const Redis = require('@upstash/redis').Redis; new Redis({url: process.env.UPSTASH_REDIS_URL, token: process.env.UPSTASH_REDIS_TOKEN}).ping().then(console.log)"
```

### "Type errors after adding validation"
```typescript
// Make sure to use the validated data, not raw body:
const validated = await validateBody(request, schema);
const { taskId, eventId } = validated; // ✅ Type-safe
// Not: const taskId = body.taskId; // ❌ Not type-safe
```

---

## 📚 Next Steps

After completing this quick start:

1. Read `COMPLETE_RESTRUCTURE_BLUEPRINT.md` for full details
2. Continue with Week 6-8: Caching
3. Week 9-12: Complete component extraction
4. Week 13-16: Performance optimization

**Questions?** Review the main blueprint or check specific examples in `/examples` directory.

---

**You're ready to start! Begin with Week 1 validation schemas. 🚀**
