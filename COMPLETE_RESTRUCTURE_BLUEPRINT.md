# Complete Application Restructure Blueprint
## Comprehensive Analysis & Implementation Guide

**Generated**: January 20, 2026  
**Objective**: Transform the codebase into a secure, fast, and modular architecture  
**Priority**: Modularity → Security → Speed

---

## 📊 CURRENT STATE ANALYSIS

### File-by-File Breakdown

#### 🔴 CRITICAL ISSUES

| File | Lines | Issues | Security Risk | Performance Impact |
|------|-------|--------|---------------|-------------------|
| `events/[id]/+page.svelte` | 1,453 | Mixed concerns, direct DB, no validation | HIGH | HIGH |
| `create-event/+page.svelte` | 2,819 | Monolithic, complex state, validation scattered | MEDIUM | HIGH |
| `+layout.svelte` | 586 | Wallet logic in UI, session handling mixed | MEDIUM | MEDIUM |
| `admin/+page.svelte` | 881 | No role caching, fetches on every load | LOW | MEDIUM |
| `verify-twitter/+server.ts` | 194 | In-memory rate limit (not production) | HIGH | LOW |
| `db schema` | 294 | Inconsistent task storage (JSONB + table) | MEDIUM | HIGH |

---

## 🎯 RESTRUCTURING STRATEGY

### Phase-Based Approach (16 Weeks Total)

```
┌─────────────────────────────────────────────────────────┐
│ PHASE 1: Security Foundation (Weeks 1-4)               │
│ ├─ Input validation layer                             │
│ ├─ Rate limiting (Redis/Upstash)                      │
│ ├─ CSRF protection                                    │
│ ├─ SQL injection prevention                           │
│ └─ API key management                                 │
├─────────────────────────────────────────────────────────┤
│ PHASE 2: Data Layer (Weeks 5-8)                       │
│ ├─ Repository pattern implementation                  │
│ ├─ Query optimization & caching                       │
│ ├─ Database schema normalization                      │
│ ├─ Connection pooling                                 │
│ └─ Migration from JSONB to relational                 │
├─────────────────────────────────────────────────────────┤
│ PHASE 3: Component Modularization (Weeks 9-12)        │
│ ├─ Extract reusable components                        │
│ ├─ Implement composition patterns                     │
│ ├─ Create custom hooks/stores                         │
│ ├─ State management optimization                      │
│ └─ Lazy loading implementation                        │
├─────────────────────────────────────────────────────────┤
│ PHASE 4: Performance & Polish (Weeks 13-16)           │
│ ├─ Implement CDN for static assets                    │
│ ├─ Add Redis caching layer                            │
│ ├─ Optimize bundle size                               │
│ ├─ Add service workers                                │
│ └─ Performance monitoring                             │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 NEW DIRECTORY STRUCTURE

```
src/
├── lib/
│   ├── core/                          # Core business logic
│   │   ├── auth/
│   │   │   ├── AuthService.ts         # Authentication logic
│   │   │   ├── SessionManager.ts      # Session handling
│   │   │   ├── WalletAuth.ts          # Wallet-specific auth
│   │   │   └── types.ts
│   │   ├── events/
│   │   │   ├── EventService.ts        # Event business logic
│   │   │   ├── EventValidator.ts      # Event validation
│   │   │   ├── EventRepository.ts     # Event data access
│   │   │   └── types.ts
│   │   ├── tasks/
│   │   │   ├── TaskService.ts         # Task orchestration
│   │   │   ├── TaskVerifier.ts        # Verification logic
│   │   │   ├── TaskRepository.ts      # Task data access
│   │   │   ├── verifiers/             # Platform-specific verifiers
│   │   │   │   ├── TwitterVerifier.ts
│   │   │   │   ├── DiscordVerifier.ts
│   │   │   │   └── TelegramVerifier.ts
│   │   │   └── types.ts
│   │   ├── rewards/
│   │   │   ├── RewardService.ts
│   │   │   ├── RewardDistributor.ts
│   │   │   └── types.ts
│   │   ├── referrals/
│   │   │   ├── ReferralService.ts
│   │   │   ├── ReferralTracker.ts
│   │   │   └── types.ts
│   │   └── admin/
│   │       ├── AdminService.ts
│   │       ├── ModerationService.ts
│   │       └── types.ts
│   │
│   ├── infrastructure/                # External integrations
│   │   ├── database/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts
│   │   │   │   ├── admin.ts
│   │   │   │   └── queries/
│   │   │   │       ├── events.queries.ts
│   │   │   │       ├── tasks.queries.ts
│   │   │   │       ├── users.queries.ts
│   │   │   │       └── submissions.queries.ts
│   │   │   ├── repositories/         # Concrete implementations
│   │   │   │   ├── SupabaseEventRepository.ts
│   │   │   │   ├── SupabaseTaskRepository.ts
│   │   │   │   ├── SupabaseUserRepository.ts
│   │   │   │   └── SupabaseSubmissionRepository.ts
│   │   │   ├── cache/
│   │   │   │   ├── RedisCache.ts     # Redis implementation
│   │   │   │   ├── MemoryCache.ts    # Fallback for dev
│   │   │   │   └── CacheManager.ts
│   │   │   └── migrations/
│   │   │       └── normalize-tasks.sql
│   │   ├── api/
│   │   │   ├── twitter/
│   │   │   │   ├── TwitterClient.ts
│   │   │   │   └── TwitterAPI.ts
│   │   │   ├── discord/
│   │   │   │   ├── DiscordClient.ts
│   │   │   │   └── DiscordAPI.ts
│   │   │   └── telegram/
│   │   │       ├── TelegramClient.ts
│   │   │       └── TelegramAPI.ts
│   │   ├── blockchain/
│   │   │   ├── ContractService.ts
│   │   │   ├── TokenService.ts
│   │   │   └── WalletService.ts
│   │   ├── storage/
│   │   │   ├── FileUploader.ts
│   │   │   ├── ImageProcessor.ts
│   │   │   └── CDNManager.ts
│   │   └── security/
│   │       ├── RateLimiter.ts        # Redis-based
│   │       ├── InputSanitizer.ts
│   │       ├── CSRFProtection.ts
│   │       └── Encryption.ts
│   │
│   ├── application/                   # Use cases (orchestrate core + infra)
│   │   ├── events/
│   │   │   ├── CreateEvent.usecase.ts
│   │   │   ├── PublishEvent.usecase.ts
│   │   │   ├── GetEventDetails.usecase.ts
│   │   │   ├── ListEvents.usecase.ts
│   │   │   └── UpdateEvent.usecase.ts
│   │   ├── tasks/
│   │   │   ├── CreateTask.usecase.ts
│   │   │   ├── SubmitTask.usecase.ts
│   │   │   ├── VerifyTask.usecase.ts
│   │   │   └── ListTaskSubmissions.usecase.ts
│   │   ├── auth/
│   │   │   ├── WalletLogin.usecase.ts
│   │   │   ├── SocialConnect.usecase.ts
│   │   │   └── Logout.usecase.ts
│   │   └── admin/
│   │       ├── ReviewEvent.usecase.ts
│   │       ├── ManageModerators.usecase.ts
│   │       └── GetPendingEvents.usecase.ts
│   │
│   ├── presentation/                  # UI layer
│   │   ├── components/
│   │   │   ├── ui/                   # Generic reusable UI
│   │   │   │   ├── Button.svelte
│   │   │   │   ├── Card.svelte
│   │   │   │   ├── Input.svelte
│   │   │   │   ├── Modal.svelte
│   │   │   │   ├── Dropdown.svelte
│   │   │   │   ├── Toast.svelte
│   │   │   │   └── Spinner.svelte
│   │   │   ├── layout/
│   │   │   │   ├── Header.svelte
│   │   │   │   ├── Footer.svelte
│   │   │   │   ├── Sidebar.svelte
│   │   │   │   └── Container.svelte
│   │   │   ├── features/             # Feature-specific components
│   │   │   │   ├── auth/
│   │   │   │   │   ├── WalletConnector.svelte
│   │   │   │   │   ├── LoginDropdown.svelte
│   │   │   │   │   └── SocialConnectButton.svelte
│   │   │   │   ├── events/
│   │   │   │   │   ├── EventCard.svelte           (100 lines)
│   │   │   │   │   ├── EventHeader.svelte         (80 lines)
│   │   │   │   │   ├── EventBanner.svelte         (60 lines)
│   │   │   │   │   ├── EventDetails.svelte        (150 lines)
│   │   │   │   │   ├── EventTimeline.svelte       (70 lines)
│   │   │   │   │   ├── EventForm/                 # Multi-step form
│   │   │   │   │   │   ├── EventFormWizard.svelte (120 lines)
│   │   │   │   │   │   ├── StepDetails.svelte     (100 lines)
│   │   │   │   │   │   ├── StepTasks.svelte       (100 lines)
│   │   │   │   │   │   └── StepRewards.svelte     (100 lines)
│   │   │   │   │   └── EventList.svelte           (120 lines)
│   │   │   │   ├── tasks/
│   │   │   │   │   ├── TaskCard.svelte            (80 lines)
│   │   │   │   │   ├── TaskList.svelte            (100 lines)
│   │   │   │   │   ├── TaskCategoryGroup.svelte   (70 lines)
│   │   │   │   │   ├── TaskSubmissionForm.svelte  (90 lines)
│   │   │   │   │   └── task-types/                # Specific task components
│   │   │   │   │       ├── TwitterTask.svelte     (120 lines)
│   │   │   │   │       ├── DiscordTask.svelte     (110 lines)
│   │   │   │   │       ├── TelegramTask.svelte    (115 lines)
│   │   │   │   │       ├── QuizTask.svelte        (150 lines)
│   │   │   │   │       ├── PuzzleTask.svelte      (100 lines)
│   │   │   │   │       ├── ContentTask.svelte     (90 lines)
│   │   │   │   │       ├── ReferralTask.svelte    (120 lines)
│   │   │   │   │       └── PredictionTask.svelte  (130 lines)
│   │   │   │   ├── rewards/
│   │   │   │   │   ├── RewardCard.svelte
│   │   │   │   │   ├── RewardBuilder/
│   │   │   │   │   │   ├── RewardTypeSelector.svelte
│   │   │   │   │   │   ├── TokenRewardConfig.svelte
│   │   │   │   │   │   ├── NFTRewardConfig.svelte
│   │   │   │   │   │   └── VoucherRewardConfig.svelte
│   │   │   │   │   └── RewardsList.svelte
│   │   │   │   ├── admin/
│   │   │   │   │   ├── EventReviewCard.svelte
│   │   │   │   │   ├── EventDetailsModal.svelte
│   │   │   │   │   ├── ModeratorList.svelte
│   │   │   │   │   └── EventApprovalActions.svelte
│   │   │   │   └── dashboard/
│   │   │   │       ├── DashboardStats.svelte
│   │   │   │       ├── UserEvents.svelte
│   │   │   │       └── RecentActivity.svelte
│   │   │   └── forms/                # Reusable form components
│   │   │       ├── FormField.svelte
│   │   │       ├── DateTimePicker.svelte
│   │   │       ├── FileUpload.svelte
│   │   │       └── RichTextEditor.svelte
│   │   ├── stores/                   # State management
│   │   │   ├── auth.store.ts         # Auth state
│   │   │   ├── events.store.ts       # Events cache
│   │   │   ├── tasks.store.ts        # Tasks state
│   │   │   ├── ui.store.ts           # UI state (modals, toasts)
│   │   │   ├── wallet.store.ts       # Wallet connection
│   │   │   └── cache.store.ts        # Client-side cache
│   │   ├── hooks/                    # Reusable Svelte hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useEvent.ts
│   │   │   ├── useTask.ts
│   │   │   ├── useForm.ts
│   │   │   ├── useDebounce.ts
│   │   │   └── useInfiniteScroll.ts
│   │   └── utils/                    # UI utilities
│   │       ├── formatters.ts
│   │       ├── validators.ts
│   │       ├── dateUtils.ts
│   │       └── urlUtils.ts
│   │
│   ├── shared/                        # Shared code
│   │   ├── types/                    # ALL TypeScript types
│   │   │   ├── index.ts              # Main exports (ALREADY CREATED)
│   │   │   ├── api.types.ts          # API request/response types
│   │   │   ├── database.types.ts     # Database table types
│   │   │   └── dto.types.ts          # Data transfer objects
│   │   ├── constants/
│   │   │   ├── app.constants.ts      # App-wide constants
│   │   │   ├── api.constants.ts      # API endpoints
│   │   │   ├── routes.constants.ts   # Route paths
│   │   │   └── task.constants.ts     # Task types, categories
│   │   ├── utils/
│   │   │   ├── string.utils.ts
│   │   │   ├── array.utils.ts
│   │   │   ├── object.utils.ts
│   │   │   ├── date.utils.ts
│   │   │   └── crypto.utils.ts
│   │   ├── errors/                   # Custom errors (ALREADY CREATED)
│   │   │   └── index.ts
│   │   └── validation/
│   │       ├── schemas/              # Zod schemas
│   │       │   ├── event.schema.ts
│   │       │   ├── task.schema.ts
│   │       │   ├── user.schema.ts
│   │       │   └── submission.schema.ts
│   │       └── validators/
│   │           ├── eventValidator.ts
│   │           ├── taskValidator.ts
│   │           └── inputValidator.ts
│   │
│   ├── server/                       # Server-only code
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rateLimit.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   ├── csrf.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── guards/
│   │   │   ├── AuthGuard.ts
│   │   │   ├── RoleGuard.ts
│   │   │   └── OwnershipGuard.ts
│   │   └── utils/
│   │       ├── apiResponse.ts
│   │       ├── errorHandler.ts
│   │       └── logger.ts
│   │
│   └── config/
│       ├── app.config.ts
│       ├── database.config.ts
│       ├── cache.config.ts
│       ├── assets.config.ts          # (ALREADY EXISTS)
│       └── env.config.ts
│
├── routes/                            # THIN route handlers
│   ├── (app)/                        # User-facing routes
│   │   ├── +layout.svelte            # (~200 lines - REDUCED FROM 586)
│   │   ├── +layout.server.ts
│   │   ├── +page.svelte              # Home
│   │   ├── events/
│   │   │   ├── +page.svelte          # Event list (~100 lines)
│   │   │   └── [id]/
│   │   │       ├── +page.svelte      # (~150 lines - REDUCED FROM 1453)
│   │   │       └── +page.server.ts   # SSR data loading
│   │   ├── dashboard/
│   │   │   └── +page.svelte          # (~120 lines)
│   │   ├── profile/
│   │   │   └── +page.svelte
│   │   └── projects/
│   │       ├── +page.svelte
│   │       ├── create-event/
│   │       │   ├── +page.svelte      # (~200 lines - REDUCED FROM 2819)
│   │       │   └── +page.server.ts
│   │       └── [id]/
│   │           └── edit/
│   │               └── +page.svelte
│   │
│   ├── (admin)/                      # Admin routes
│   │   ├── +layout.svelte
│   │   ├── +layout.server.ts         # Role check
│   │   └── admin/
│   │       └── +page.svelte          # (~200 lines - REDUCED FROM 881)
│   │
│   ├── api/                          # API endpoints (THIN handlers)
│   │   ├── v1/                       # Versioned API
│   │   │   ├── events/
│   │   │   │   ├── +server.ts        # GET, POST (~60 lines)
│   │   │   │   └── [id]/
│   │   │   │       ├── +server.ts    # GET, PATCH, DELETE (~50 lines)
│   │   │   │       ├── tasks/
│   │   │   │       │   └── +server.ts # (~40 lines)
│   │   │   │       ├── rewards/
│   │   │   │       │   └── +server.ts
│   │   │   │       └── participants/
│   │   │   │           └── +server.ts
│   │   │   ├── tasks/
│   │   │   │   ├── verify/
│   │   │   │   │   ├── twitter/+server.ts  # (~50 lines - REDUCED FROM 194)
│   │   │   │   │   ├── discord/+server.ts
│   │   │   │   │   └── telegram/+server.ts
│   │   │   │   └── submit/
│   │   │   │       └── +server.ts
│   │   │   ├── auth/
│   │   │   │   ├── wallet/
│   │   │   │   │   ├── nonce/+server.ts
│   │   │   │   │   └── verify/+server.ts
│   │   │   │   ├── social/
│   │   │   │   │   ├── twitter/+server.ts
│   │   │   │   │   ├── discord/+server.ts
│   │   │   │   │   └── telegram/+server.ts
│   │   │   │   └── logout/+server.ts
│   │   │   ├── referrals/
│   │   │   │   ├── count/+server.ts
│   │   │   │   └── track/+server.ts
│   │   │   ├── admin/
│   │   │   │   ├── events/
│   │   │   │   │   ├── pending/+server.ts
│   │   │   │   │   └── approve/+server.ts
│   │   │   │   └── moderators/
│   │   │   │       └── +server.ts
│   │   │   └── uploads/
│   │   │       └── +server.ts
│   │   └── webhooks/                # External webhooks
│   │       ├── discord/+server.ts
│   │       └── telegram/+server.ts
│   │
│   └── auth/                        # OAuth callbacks
│       ├── discord/
│       │   ├── callback/+server.ts
│       │   └── success/+page.svelte
│       ├── twitter/
│       │   └── callback/+server.ts
│       └── telegram/
│           └── callback/+server.ts
│
└── hooks.server.ts                  # (~100 lines - auth, session)
```

---

## 🔒 SECURITY IMPLEMENTATION PLAN

### Week 1-2: Input Validation & Sanitization

#### Create Validation Middleware

**File**: `src/lib/server/middleware/validation.middleware.ts`

```typescript
import { z } from 'zod';
import type { RequestHandler } from '@sveltejs/kit';
import { ValidationError } from '$lib/shared/errors';

export function validateRequest<T extends z.ZodType>(schema: T): RequestHandler {
  return async ({ request }) => {
    try {
      const body = await request.json();
      const validated = schema.parse(body);
      
      // Attach validated data to request locals
      return {
        validated
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Invalid request data',
          error.errors
        );
      }
      throw error;
    }
  };
}
```

**Usage in API Route**:
```typescript
// src/routes/api/v1/events/+server.ts
import { eventCreateSchema } from '$lib/shared/validation/schemas/event.schema';
import { validateRequest } from '$lib/server/middleware/validation.middleware';
import { CreateEvent } from '$lib/application/events/CreateEvent.usecase';

export const POST: RequestHandler = async ({ locals, request }) => {
  // Validate input
  const validated = await validateRequest(eventCreateSchema)({ request, locals });
  
  // Execute use case
  const useCase = new CreateEvent();
  const event = await useCase.execute(validated, locals.user.id);
  
  return json({ success: true, data: event }, { status: 201 });
};
```

#### Input Sanitization

**File**: `src/lib/infrastructure/security/InputSanitizer.ts`

```typescript
import DOMPurify from 'isomorphic-dompurify';

export class InputSanitizer {
  static sanitizeHTML(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href']
    });
  }

  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .substring(0, 1000); // Limit length
  }

  static sanitizeURL(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }
      return parsed.href;
    } catch {
      return null;
    }
  }
}
```

### Week 3: Rate Limiting (Redis-based)

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

  async checkLimit(
    key: string,
    maxRequests: number = 10,
    windowSeconds: number = 60
  ): Promise<void> {
    const count = await this.redis.incr(key);
    
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    if (count > maxRequests) {
      const ttl = await this.redis.ttl(key);
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${ttl} seconds.`,
        { resetIn: ttl }
      );
    }
  }

  async getRemainingRequests(
    key: string,
    maxRequests: number = 10
  ): Promise<number> {
    const count = await this.redis.get<number>(key) || 0;
    return Math.max(0, maxRequests - count);
  }
}
```

**Usage**:
```typescript
// In API route
import { RateLimiter } from '$lib/infrastructure/security/RateLimiter';

export const POST: RequestHandler = async ({ locals, request }) => {
  const limiter = new RateLimiter();
  await limiter.checkLimit(`verify:${locals.user.id}`, 10, 60);
  
  // Continue with request...
};
```

### Week 4: CSRF Protection

**File**: `src/lib/server/middleware/csrf.middleware.ts`

```typescript
import { randomBytes } from 'crypto';
import { ForbiddenError } from '$lib/shared/errors';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

export function verifyCSRFToken(
  cookieToken: string | undefined,
  headerToken: string | undefined
): void {
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new ForbiddenError('Invalid CSRF token');
  }
}

export const csrfMiddleware: RequestHandler = async ({ request, cookies }) => {
  if (request.method !== 'GET') {
    const cookieToken = cookies.get(CSRF_COOKIE_NAME);
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    verifyCSRFToken(cookieToken, headerToken);
  }
};
```

---

## ⚡ PERFORMANCE OPTIMIZATION PLAN

### Week 5-6: Caching Layer

#### Redis Cache Implementation

**File**: `src/lib/infrastructure/database/cache/RedisCache.ts`

```typescript
import { Redis } from '@upstash/redis';

export class RedisCache {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!
    });
  }

  async get<T>(key: string): Promise<T | null> {
    return await this.redis.get<T>(key);
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    await this.redis.set(key, value, { ex: ttlSeconds });
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

**Usage in Repository**:
```typescript
// src/lib/core/events/EventRepository.ts
import { RedisCache } from '$lib/infrastructure/database/cache/RedisCache';

export class EventRepository {
  private cache = new RedisCache();

  async findById(id: string): Promise<Event> {
    // Try cache first
    const cached = await this.cache.get<Event>(`event:${id}`);
    if (cached) return cached;

    // Fetch from database
    const event = await this.fetchFromDatabase(id);
    
    // Cache for 5 minutes
    await this.cache.set(`event:${id}`, event, 300);
    
    return event;
  }

  async update(id: string, data: Partial<Event>): Promise<Event> {
    const updated = await this.updateInDatabase(id, data);
    
    // Invalidate cache
    await this.cache.invalidate(`event:${id}*`);
    
    return updated;
  }
}
```

### Week 7: Component Lazy Loading

**File**: `src/routes/(app)/events/[id]/+page.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  
  // Static imports for critical components
  import EventHeader from '$lib/presentation/components/features/events/EventHeader.svelte';
  
  // Dynamic imports for below-the-fold content
  let TaskList: any;
  let RewardsList: any;
  
  onMount(async () => {
    // Lazy load task list
    TaskList = (await import('$lib/presentation/components/features/tasks/TaskList.svelte')).default;
    
    // Lazy load rewards
    RewardsList = (await import('$lib/presentation/components/features/rewards/RewardsList.svelte')).default;
  });
</script>

<EventHeader {event} />

{#if TaskList}
  <svelte:component this={TaskList} tasks={event.tasks} />
{:else}
  <div class="loading-skeleton">Loading tasks...</div>
{/if}

{#if RewardsList}
  <svelte:component this={RewardsList} rewards={event.rewards} />
{:else}
  <div class="loading-skeleton">Loading rewards...</div>
{/if}
```

### Week 8: Database Query Optimization

#### Batch Queries

**File**: `src/lib/infrastructure/database/queries/events.queries.ts`

```typescript
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export class EventQueries {
  // Instead of multiple queries, use a single query with joins
  static async getEventWithDetails(eventId: string) {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select(`
        *,
        creator:users!created_by (
          id,
          username,
          wallet_address
        ),
        participants:event_participants (
          count
        ),
        submissions:task_submissions (
          count
        )
      `)
      .eq('id', eventId)
      .single();

    if (error) throw error;
    return data;
  }

  // Paginated queries
  static async listEvents(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    
    const { data, error, count } = await supabaseAdmin
      .from('events')
      .select('*, creator:users!created_by(username)', { count: 'exact' })
      .eq('status', 'active')
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    
    return {
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    };
  }
}
```

---

## 🧩 COMPONENT MODULARIZATION

### Breaking Down `events/[id]/+page.svelte` (1453 → 150 lines)

#### New Structure

**Before (1453 lines)**:
```svelte
<!-- EVERYTHING in one file -->
- Event data fetching
- User authentication
- Task state management  
- Submission handling
- Verification logic
- UI rendering
- Form handling
- Error handling
```

**After (150 lines total across multiple files)**:

1. **Main Page Component** (`+page.svelte` - 150 lines)
```svelte
<script lang="ts">
  import EventHeader from '$lib/presentation/components/features/events/EventHeader.svelte';
  import TaskList from '$lib/presentation/components/features/tasks/TaskList.svelte';
  import { useEvent } from '$lib/presentation/hooks/useEvent';
  
  export let data; // From +page.server.ts
  
  const { event, loading, error } = useEvent(data.event);
</script>

<EventHeader {event} />
<TaskList tasks={event.tasks} userId={data.user?.id} eventId={event.id} />
```

2. **Server Load** (`+page.server.ts` - 40 lines)
```typescript
import { GetEventDetails } from '$lib/application/events/GetEventDetails.usecase';

export const load = async ({ params, locals }) => {
  const useCase = new GetEventDetails();
  const event = await useCase.execute(params.id, locals.user?.id);
  
  return {
    event,
    user: locals.user
  };
};
```

3. **Event Header Component** (`EventHeader.svelte` - 80 lines)
```svelte
<script lang="ts">
  export let event: Event;
</script>

<div class="event-header">
  {#if event.banner_url}
    <img src={event.banner_url} alt={event.title} />
  {/if}
  <h1>{event.title}</h1>
  <p>{event.description}</p>
  <div class="event-meta">
    <span>Start: {formatDate(event.start_time)}</span>
    <span>End: {formatDate(event.end_time)}</span>
    <span>Participants: {event.participants_count}</span>
  </div>
</div>
```

4. **Task List Component** (`TaskList.svelte` - 100 lines)
```svelte
<script lang="ts">
  import TaskCard from './TaskCard.svelte';
  import type { Task } from '$lib/shared/types';
  
  export let tasks: Task[];
  export let userId: string | null;
  export let eventId: string;
  
  $: groupedTasks = groupByCategory(tasks);
</script>

{#each Object.entries(groupedTasks) as [category, categoryTasks]}
  <div class="task-category">
    <h3>{category}</h3>
    {#each categoryTasks as task}
      <TaskCard {task} {userId} {eventId} />
    {/each}
  </div>
{/each}
```

5. **Custom Hook** (`useEvent.ts` - 50 lines)
```typescript
import { writable, derived } from 'svelte/store';
import type { Event } from '$lib/shared/types';

export function useEvent(initialEvent: Event) {
  const event = writable(initialEvent);
  const loading = writable(false);
  const error = writable<string | null>(null);

  async function refresh() {
    loading.set(true);
    try {
      const response = await fetch(`/api/v1/events/${initialEvent.id}`);
      const data = await response.json();
      event.set(data);
      error.set(null);
    } catch (e) {
      error.set(e.message);
    } finally {
      loading.set(false);
    }
  }

  return {
    event: derived(event, $e => $e),
    loading: derived(loading, $l => $l),
    error: derived(error, $e => $e),
    refresh
  };
}
```

### Breaking Down `create-event/+page.svelte` (2819 → 200 lines)

**New Structure**:

1. **Main Page** (`+page.svelte` - 200 lines)
```svelte
<script lang="ts">
  import EventFormWizard from '$lib/presentation/components/features/events/EventForm/EventFormWizard.svelte';
  import { useForm } from '$lib/presentation/hooks/useForm';
  
  const { formData, errors, submit } = useForm();
</script>

<EventFormWizard 
  on:submit={submit}
  bind:data={formData}
  {errors}
/>
```

2. **Form Wizard** (`EventFormWizard.svelte` - 120 lines)
```svelte
<script lang="ts">
  import StepDetails from './StepDetails.svelte';
  import StepTasks from './StepTasks.svelte';
  import StepRewards from './StepRewards.svelte';
  
  export let data;
  export let errors;
  
  let currentStep = 0;
  const steps = ['Details', 'Tasks', 'Rewards'];
</script>

<div class="wizard">
  <div class="steps">
    {#each steps as step, i}
      <button class:active={i === currentStep} on:click={() => currentStep = i}>
        {step}
      </button>
    {/each}
  </div>

  {#if currentStep === 0}
    <StepDetails bind:data {errors} />
  {:else if currentStep === 1}
    <StepTasks bind:data {errors} />
  {:else}
    <StepRewards bind:data {errors} />
  {/if}
</div>
```

3. **Step Components** (100 lines each)
- `StepDetails.svelte`: Event basic info
- `StepTasks.svelte`: Task builder
- `StepRewards.svelte`: Reward configuration

---

## 📊 MANUAL ASSISTANCE NEEDED

### Your Role in This Process

#### Phase 1: Preparation (Week 0 - Before Starting)

**Tasks You'll Do**:

1. **Set Up Redis/Upstash Account**
   ```bash
   # Go to: https://upstash.com
   # Create account
   # Create Redis database
   # Copy URL and token to .env:
   UPSTASH_REDIS_URL=your_url_here
   UPSTASH_REDIS_TOKEN=your_token_here
   ```

2. **Install New Dependencies**
   ```bash
   npm install @upstash/redis zod isomorphic-dompurify
   npm install -D @types/dompurify
   ```

3. **Create Feature Branch**
   ```bash
   git checkout -b refactor/phase-1-security
   ```

#### Phase 2: During Implementation

**Week-by-Week Checklist**:

**Week 1**: Security Foundation
- [ ] I'll create: Validation middleware, schemas
- [ ] You do: Test each API endpoint with invalid data
- [ ] You do: Add schemas for remaining endpoints
- [ ] Verify: Try XSS attacks, they should be blocked

**Week 2**: Input Sanitization
- [ ] I'll create: InputSanitizer class
- [ ] You do: Add sanitization to all user inputs
- [ ] You do: Test with malicious HTML/scripts
- [ ] Verify: No scripts execute in browser

**Week 3**: Rate Limiting
- [ ] I'll create: RateLimiter class
- [ ] You do: Apply to all API endpoints
- [ ] You do: Test by making rapid requests
- [ ] Verify: 429 errors after limit exceeded

**Week 4**: CSRF Protection
- [ ] I'll create: CSRF middleware
- [ ] You do: Add to all POST/PUT/DELETE routes
- [ ] You do: Add CSRF token to frontend forms
- [ ] Verify: Requests without token fail

**Week 5-6**: Caching
- [ ] I'll create: Cache classes, Repository pattern
- [ ] You do: Replace direct Supabase calls
- [ ] You do: Test cache invalidation
- [ ] Verify: Check Redis dashboard for cached data

**Week 7-8**: Database Optimization
- [ ] I'll create: Optimized queries
- [ ] You do: Run EXPLAIN ANALYZE on queries
- [ ] You do: Add missing indexes
- [ ] Verify: Query times reduced 50%+

**Week 9-10**: Component Extraction
- [ ] I'll create: Base components
- [ ] You do: Extract components from large files
- [ ] You do: Test each component in isolation
- [ ] Verify: File sizes under 200 lines

**Week 11-12**: State Management
- [ ] I'll create: Stores and hooks
- [ ] You do: Replace prop drilling with stores
- [ ] You do: Test state updates
- [ ] Verify: No unnecessary re-renders

**Week 13-14**: Performance Optimization
- [ ] I'll create: Lazy loading setup
- [ ] You do: Apply to large components
- [ ] You do: Run Lighthouse audits
- [ ] Verify: Performance score > 90

**Week 15-16**: Polish & Testing
- [ ] I'll create: Test utilities
- [ ] You do: Write unit tests for critical paths
- [ ] You do: End-to-end testing
- [ ] Verify: All tests pass

#### Testing Checklist (Your Responsibility)

For each feature you implement:

```bash
# 1. Unit Tests
npm run test:unit

# 2. Integration Tests
npm run test:integration

# 3. E2E Tests
npm run test:e2e

# 4. Performance Test
npm run lighthouse

# 5. Security Scan
npm run security:check
```

#### Migration Checklist

**Before Deploying Each Phase**:

1. [ ] Create database backup
   ```sql
   pg_dump -h your_host -U your_user -d your_db > backup.sql
   ```

2. [ ] Run migrations in transaction
   ```sql
   BEGIN;
   -- Run migration
   -- Test queries
   -- If OK: COMMIT
   -- If error: ROLLBACK
   ```

3. [ ] Deploy to staging first
   ```bash
   git push staging refactor/phase-X
   ```

4. [ ] Test on staging for 24 hours

5. [ ] Deploy to production
   ```bash
   git push production refactor/phase-X
   ```

6. [ ] Monitor errors for 48 hours

---

## 🎯 SUCCESS METRICS

### Track These KPIs

**Security**:
- [ ] Zero XSS vulnerabilities
- [ ] Zero SQL injection vulnerabilities
- [ ] 100% rate-limited endpoints
- [ ] CSRF tokens on all mutations

**Performance**:
- [ ] Lighthouse score > 90
- [ ] Time to Interactive < 3s
- [ ] First Contentful Paint < 1.5s
- [ ] API response time < 200ms (cached)
- [ ] API response time < 1s (uncached)

**Code Quality**:
- [ ] Average component size < 200 lines
- [ ] Test coverage > 70%
- [ ] No files > 500 lines
- [ ] TypeScript strict mode enabled
- [ ] Zero `any` types in new code

**Developer Experience**:
- [ ] New task type: 15 minutes (vs 2-3 hours)
- [ ] New feature: 1-2 days (vs 1 week)
- [ ] Bug fix: 1 hour (vs 4 hours)
- [ ] Onboarding: 2 days (vs 2 weeks)

---

## 📝 IMPLEMENTATION EXAMPLES

### Example 1: Migrating Event Detail Page

**Step 1: Create Use Case**
```typescript
// src/lib/application/events/GetEventDetails.usecase.ts
import { EventRepository } from '$lib/core/events/EventRepository';
import { EventNotFoundError } from '$lib/shared/errors';

export class GetEventDetails {
  private eventRepo = new EventRepository();

  async execute(eventId: string, userId?: string) {
    const event = await this.eventRepo.findById(eventId);
    
    if (!event) {
      throw new EventNotFoundError(eventId);
    }

    // Load additional data if user is logged in
    if (userId) {
      event.userSubmissions = await this.eventRepo.getUserSubmissions(
        eventId,
        userId
      );
      event.hasJoined = await this.eventRepo.hasUserJoined(eventId, userId);
    }

    return event;
  }
}
```

**Step 2: Update Server Load**
```typescript
// src/routes/(app)/events/[id]/+page.server.ts
import { GetEventDetails } from '$lib/application/events/GetEventDetails.usecase';

export const load = async ({ params, locals }) => {
  const useCase = new GetEventDetails();
  
  try {
    const event = await useCase.execute(params.id, locals.user?.id);
    
    return {
      event,
      user: locals.user
    };
  } catch (error) {
    if (error instanceof EventNotFoundError) {
      throw redirect(302, '/');
    }
    throw error;
  }
};
```

**Step 3: Simplify Page Component**
```svelte
<!-- src/routes/(app)/events/[id]/+page.svelte -->
<script lang="ts">
  import EventHeader from '$lib/presentation/components/features/events/EventHeader.svelte';
  import TaskList from '$lib/presentation/components/features/tasks/TaskList.svelte';
  import RewardsList from '$lib/presentation/components/features/rewards/RewardsList.svelte';
  
  export let data;
  
  $: ({ event, user } = data);
</script>

<div class="event-page">
  <EventHeader {event} />
  
  <section class="tasks-section">
    <h2>Tasks</h2>
    <TaskList 
      tasks={event.tasks}
      userId={user?.id}
      eventId={event.id}
      eventEnded={new Date(event.end_time) < new Date()}
    />
  </section>
  
  <section class="rewards-section">
    <h2>Rewards</h2>
    <RewardsList rewards={event.rewards} />
  </section>
</div>

<style>
  .event-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .tasks-section,
  .rewards-section {
    margin-top: 3rem;
  }
</style>
```

### Example 2: Secure API Endpoint

**Before** (Insecure):
```typescript
// src/routes/api/events/+server.ts
export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  
  const { data, error } = await supabaseAdmin
    .from('events')
    .insert(body); // DANGER: No validation!
    
  return json({ data });
};
```

**After** (Secure):
```typescript
// src/routes/api/v1/events/+server.ts
import { validateRequest } from '$lib/server/middleware/validation.middleware';
import { csrfMiddleware } from '$lib/server/middleware/csrf.middleware';
import { RateLimiter } from '$lib/infrastructure/security/RateLimiter';
import { CreateEvent } from '$lib/application/events/CreateEvent.usecase';
import { eventCreateSchema } from '$lib/shared/validation/schemas/event.schema';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  // 1. CSRF protection
  await csrfMiddleware({ request, cookies });
  
  // 2. Rate limiting
  const limiter = new RateLimiter();
  await limiter.checkLimit(`create-event:${locals.user.id}`, 5, 3600); // 5 per hour
  
  // 3. Validate input
  const body = await request.json();
  const validated = eventCreateSchema.parse(body);
  
  // 4. Execute use case
  const useCase = new CreateEvent();
  const event = await useCase.execute(validated, locals.user.id);
  
  // 5. Return response
  return json({ 
    success: true, 
    data: event 
  }, { status: 201 });
};
```

---

## 🚀 DEPLOYMENT STRATEGY

### Staged Rollout

**Week 1-4: Security Phase**
```bash
# Deploy to staging
npm run build
npm run deploy:staging

# Test for 3 days
npm run test:staging

# Deploy to production (20% traffic)
npm run deploy:production --canary=20

# Monitor for 2 days
# If OK, increase to 100%
npm run deploy:production --canary=100
```

**Week 5-8: Data Layer**
```bash
# Database migration
npm run migrate:staging
# Test all queries
npm run test:queries:staging
# Migrate production
npm run migrate:production
```

**Week 9-12: Components**
```bash
# Deploy component changes
# These are mostly UI, lower risk
npm run deploy:production
```

**Week 13-16: Performance**
```bash
# Enable caching gradually
# Start with read-only endpoints
# Monitor cache hit rates
# Expand to all endpoints
```

---

## 📋 FINAL CHECKLIST

Before considering the refactor complete:

### Code Quality
- [ ] All files < 500 lines
- [ ] Average component < 200 lines
- [ ] No duplicate code
- [ ] TypeScript strict mode
- [ ] Zero `any` types
- [ ] 100% type coverage

### Security
- [ ] All inputs validated
- [ ] All outputs sanitized
- [ ] Rate limiting on all endpoints
- [ ] CSRF protection on mutations
- [ ] SQL injection tests pass
- [ ] XSS tests pass
- [ ] Security audit completed

### Performance
- [ ] Redis caching implemented
- [ ] Database queries optimized
- [ ] Lazy loading on large components
- [ ] Bundle size < 500KB
- [ ] Lighthouse score > 90
- [ ] Time to Interactive < 3s

### Testing
- [ ] Unit tests > 70% coverage
- [ ] Integration tests for critical paths
- [ ] E2E tests for user flows
- [ ] Performance tests pass
- [ ] Load tests pass (1000 concurrent users)

### Documentation
- [ ] API documentation complete
- [ ] Component storybook
- [ ] README updated
- [ ] Architecture diagrams
- [ ] Onboarding guide

### Deployment
- [ ] Staging environment tested
- [ ] Canary deployment successful
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Error tracking setup (Sentry)

---

## 🎓 LEARNING RESOURCES

While implementing, refer to:

1. **SvelteKit Best Practices**
   - https://kit.svelte.dev/docs/best-practices

2. **Security**
   - OWASP Top 10: https://owasp.org/www-project-top-ten/
   - Input validation: https://cheatsheetseries.owasp.org/

3. **Performance**
   - Web Vitals: https://web.dev/vitals/
   - Lighthouse: https://developer.chrome.com/docs/lighthouse/

4. **Clean Architecture**
   - https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html

---

## 💬 SUMMARY

This blueprint transforms your application from:

**Current State**:
- Monolithic files (1000+ lines)
- Mixed concerns (UI + logic + data)
- Security vulnerabilities
- Performance issues
- Hard to maintain

**Target State**:
- Modular components (< 200 lines each)
- Clean separation of concerns
- Secure by default
- Fast & cached
- Easy to maintain & extend

**Timeline**: 16 weeks
**Effort**: 3-4 hours per day
**Risk**: Low (gradual migration)
**ROI**: 10x faster development within 6 months

---

**Next Step**: Start with Week 1 - Security Foundation. I'll create all the base files, and you'll apply them to your existing code.

Ready to begin? 🚀
