# File-by-File Analysis & Restructure Plan

This document provides detailed analysis of EVERY critical file in the application, what it currently does, what's wrong with it, and exactly how to restructure it.

---

## 📂 CURRENT FILE INVENTORY

### Routes (Pages)

#### 1. `src/routes/events/[id]/+page.svelte` (1,453 lines) 🔴

**What it does**:
- Fetches event data from Supabase
- Manages user authentication state
- Handles task submissions
- Verifies task completion
- Manages referral tracking
- Renders event details, tasks, and rewards
- Handles video embedding
- Manages scoreline predictions
- Groups tasks by category

**Problems**:
1. **Mixed Concerns**: UI + data fetching + business logic + state management
2. **Direct DB Access**: Supabase queries directly in component
3. **No Validation**: Type-unsafe data handling (`any` types everywhere)
4. **Security**: No input sanitization, no rate limiting
5. **Performance**: Fetches all data on mount, no caching
6. **Maintainability**: 1,453 lines - impossible to understand quickly
7. **Reusability**: Logic tightly coupled to this specific page

**Current Structure**:
```svelte
<script lang="ts">
  // Lines 1-40: Imports and type definitions (inline, not shared)
  // Lines 41-116: onMount - Fetch event, user, submissions
  // Lines 118-131: joinEvent function - Direct DB insert
  // Lines 133-220: verifyAndSubmitTask - Task verification logic
  // Lines 222-238: getVideoEmbedUrl - Utility function
  // Lines 240-242: formatDate - Utility function
  // Lines 244-246: getTaskComponent - Task registry lookup
  // Lines 248-262: getTaskCategory - Categorization logic
  // Lines 264-274: groupTasksByCategory - Grouping logic
  // Lines 276-288: Login prompt functions
  // Lines 290-437: submitPrediction - Scoreline prediction logic
  // Lines 439-1453: HTML template + styles
</script>
```

**How to restructure**:

**Target Structure** (150 lines):
```svelte
<!-- src/routes/(app)/events/[id]/+page.svelte -->
<script lang="ts">
  import EventHeader from '$lib/presentation/components/features/events/EventHeader.svelte';
  import TaskList from '$lib/presentation/components/features/tasks/TaskList.svelte';
  import RewardsList from '$lib/presentation/components/features/rewards/RewardsList.svelte';
  import { useEvent } from '$lib/presentation/hooks/useEvent';
  
  export let data; // From +page.server.ts
  
  const { event, refresh } = useEvent(data.event);
</script>

<div class="event-page">
  <EventHeader {event} />
  <TaskList 
    tasks={event.tasks}
    userId={data.user?.id}
    eventId={event.id}
    on:completed={refresh}
  />
  <RewardsList rewards={event.rewards} />
</div>

<style>
  .event-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
</style>
```

**New Files Created**:
1. `+page.server.ts` (40 lines) - SSR data loading
2. `EventHeader.svelte` (80 lines) - Header component
3. `TaskList.svelte` (120 lines) - Task list with categories
4. `TaskCard.svelte` (100 lines) - Individual task
5. `RewardsList.svelte` (80 lines) - Rewards display
6. `useEvent.ts` (60 lines) - Event state hook
7. `GetEventDetails.usecase.ts` (80 lines) - Business logic

**Migration Steps**:
1. Create `+page.server.ts` with data loading
2. Extract EventHeader component
3. Extract TaskList component
4. Extract RewardsList component
5. Create useEvent hook
6. Update +page.svelte to use components
7. Test thoroughly
8. Delete old code

---

#### 2. `src/routes/projects/create-event/+page.svelte` (2,819 lines) 🔴

**What it does**:
- Multi-step event creation wizard
- Form validation
- File uploads (logo, banner)
- Task configuration
- Reward configuration
- Discord bot setup
- Telegram bot setup
- Event preview
- Auto-save functionality
- Asset management

**Problems**:
1. **Monolithic**: 2,819 lines in a single file
2. **Complex State**: 50+ state variables
3. **Scattered Validation**: Validation logic spread throughout
4. **No Separation**: Form logic, UI, and business logic mixed
5. **Difficult to Test**: Can't test individual steps
6. **Hard to Maintain**: Finding bugs takes hours
7. **Performance**: Entire form re-renders on any change

**Current Structure**:
```svelte
<script lang="ts">
  // Lines 1-50: Imports and type definitions
  // Lines 51-150: State variables (50+ variables)
  // Lines 151-250: Discord setup state
  // Lines 251-350: Rewards state
  // Lines 351-450: Step navigation functions
  // Lines 451-600: Validation functions
  // Lines 601-800: File upload handlers
  // Lines 801-1000: Task management
  // Lines 1001-1200: Reward management
  // Lines 1201-1400: Auto-save logic
  // Lines 1401-2819: HTML template + massive styles
</script>
```

**How to restructure**:

**Target Structure** (200 lines):
```svelte
<!-- src/routes/(app)/projects/create-event/+page.svelte -->
<script lang="ts">
  import EventFormWizard from '$lib/presentation/components/features/events/EventForm/EventFormWizard.svelte';
  import { CreateEvent } from '$lib/application/events/CreateEvent.usecase';
  import { goto } from '$app/navigation';
  
  let saving = false;
  let error = '';
  
  async function handleSubmit(formData: CreateEventDto) {
    saving = true;
    try {
      const useCase = new CreateEvent();
      const event = await useCase.execute(formData);
      goto(`/events/${event.id}`);
    } catch (e) {
      error = e.message;
    } finally {
      saving = false;
    }
  }
</script>

<div class="create-event-page">
  <h1>Create Event</h1>
  
  <EventFormWizard 
    on:submit={handleSubmit}
    {saving}
    {error}
  />
</div>
```

**New Files Created**:
1. `EventFormWizard.svelte` (150 lines) - Main wizard container
2. `StepDetails.svelte` (120 lines) - Event details step
3. `StepTasks.svelte` (150 lines) - Tasks step
4. `StepRewards.svelte` (150 lines) - Rewards step
5. `TaskBuilder.svelte` (100 lines) - Task creation UI
6. `RewardBuilder.svelte` (100 lines) - Reward creation UI
7. `DiscordSetup.svelte` (80 lines) - Discord bot setup
8. `FileUpload.svelte` (70 lines) - Reusable file uploader
9. `useFormWizard.ts` (80 lines) - Wizard state management
10. `CreateEvent.usecase.ts` (100 lines) - Event creation logic

---

#### 3. `src/routes/+layout.svelte` (586 lines) 🟡

**What it does**:
- Navigation bar
- Wallet connection
- User authentication
- Session management
- Mobile menu
- Chain selection
- Logout functionality

**Problems**:
1. **Mixed Concerns**: Authentication logic + UI in same file
2. **Wallet Logic in UI**: Should be in separate service
3. **Session Handling**: Should be in middleware
4. **Large Component**: 586 lines for a layout
5. **Duplicate Logic**: Mobile/desktop menus have duplicate code

**How to restructure**:

**Target Structure** (200 lines):
```svelte
<!-- src/routes/(app)/+layout.svelte -->
<script lang="ts">
  import Header from '$lib/presentation/components/layout/Header.svelte';
  import { authStore } from '$lib/presentation/stores/auth.store';
  
  export let data;
  
  $: authStore.set(data.user);
</script>

<div class="app-layout">
  <Header user={data.user} />
  <main class="main-content">
    <slot />
  </main>
</div>
```

**New Files**:
1. `Header.svelte` (120 lines) - Navigation header
2. `WalletConnector.svelte` (100 lines) - Wallet connection
3. `MobileMenu.svelte` (80 lines) - Mobile navigation
4. `auth.store.ts` (60 lines) - Auth state
5. `WalletService.ts` (100 lines) - Wallet connection logic
6. `+layout.server.ts` (40 lines) - Session loading

---

#### 4. `src/routes/admin/+page.svelte` (881 lines) 🟡

**What it does**:
- Event review system
- Moderator management
- Event approval/rejection
- Event details modal

**Problems**:
1. **No Role Caching**: Fetches role on every load
2. **Direct DB Calls**: No repository pattern
3. **Large Component**: 881 lines
4. **Mixed Concerns**: Admin logic + UI together

**How to restructure**:

**Target Structure** (200 lines):
```svelte
<!-- src/routes/(admin)/admin/+page.svelte -->
<script lang="ts">
  import EventReviewList from '$lib/presentation/components/features/admin/EventReviewList.svelte';
  import ModeratorManager from '$lib/presentation/components/features/admin/ModeratorManager.svelte';
  
  export let data;
</script>

<div class="admin-dashboard">
  <h1>Admin Dashboard</h1>
  
  <EventReviewList events={data.pendingEvents} />
  <ModeratorManager moderators={data.moderators} isAdmin={data.isAdmin} />
</div>
```

**New Files**:
1. `EventReviewList.svelte` (150 lines)
2. `EventReviewCard.svelte` (100 lines)
3. `EventDetailsModal.svelte` (120 lines)
4. `ModeratorManager.svelte` (100 lines)
5. `+layout.server.ts` (50 lines) - Role check

---

### API Routes

#### 5. `src/routes/api/events/+server.ts` (93 lines) 🟢 GOOD

**What it does**:
- Creates new events
- Validates input
- Inserts into database

**Problems**:
1. **Manual Validation**: Uses custom `ensureString` instead of Zod
2. **No Rate Limiting**: Anyone can spam event creation
3. **No Repository**: Direct Supabase calls
4. **Mixed Status Logic**: Status logic in route handler

**How to improve**:

**Current**:
```typescript
export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  const title = ensureString(body.title, 'title');
  // ... manual validation
  const { data, error } = await supabaseAdmin.from('events').insert(...);
};
```

**Improved**:
```typescript
import { validateBody } from '$lib/server/middleware/validation.middleware';
import { eventCreateSchema } from '$lib/shared/validation/schemas/event.schema';
import { RateLimiter } from '$lib/infrastructure/security/RateLimiter';
import { CreateEvent } from '$lib/application/events/CreateEvent.usecase';

export const POST: RequestHandler = async ({ request, locals }) => {
  // Rate limit
  const limiter = new RateLimiter();
  await limiter.check(`create-event:${locals.user.id}`, 5, 3600);
  
  // Validate
  const validated = await validateBody(request, eventCreateSchema);
  
  // Execute use case
  const useCase = new CreateEvent();
  const event = await useCase.execute(validated, locals.user.id);
  
  return json({ success: true, data: event }, { status: 201 });
};
```

---

#### 6. `src/routes/api/tasks/verify-twitter/+server.ts` (194 lines) 🟡

**What it does**:
- Verifies Twitter actions (follow, like, retweet, quote)
- Checks social connections
- Retries with exponential backoff
- Rate limiting (in-memory)

**Problems**:
1. **In-Memory Rate Limit**: Won't work with multiple servers
2. **Long File**: 194 lines for single endpoint
3. **Twitter API Logic**: Should be in separate service
4. **No Caching**: Fetches connection every time
5. **Token Expiry**: Basic expiry check, no refresh

**How to restructure**:

**Current Structure**:
```typescript
// Lines 1-27: Retry logic
// Lines 29-97: POST handler with rate limit
// Lines 99-127: verifyFollow function
// Lines 129-146: verifyLike function
// Lines 148-165: verifyRetweet function
// Lines 167-188: verifyQuote function
// Lines 190-194: extractTweetId utility
```

**Target Structure** (50 lines):
```typescript
// src/routes/api/v1/tasks/verify/twitter/+server.ts
import { RateLimiter } from '$lib/infrastructure/security/RateLimiter';
import { VerifyTwitterTask } from '$lib/application/tasks/VerifyTwitterTask.usecase';
import { validateBody } from '$lib/server/middleware/validation.middleware';
import { twitterVerificationSchema } from '$lib/shared/validation/schemas/task.schema';

export const POST: RequestHandler = async ({ request, locals }) => {
  // Rate limit
  const limiter = new RateLimiter();
  await limiter.check(`twitter-verify:${locals.user.id}`, 10, 60);
  
  // Validate
  const validated = await validateBody(request, twitterVerificationSchema);
  
  // Execute use case
  const useCase = new VerifyTwitterTask();
  const result = await useCase.execute(validated, locals.user.id);
  
  return json({ success: true, data: result });
};
```

**New Files**:
1. `TwitterVerifier.ts` (150 lines) - Twitter API verification logic
2. `TwitterClient.ts` (100 lines) - Twitter API client
3. `SocialConnectionService.ts` (80 lines) - Social connections management
4. `VerifyTwitterTask.usecase.ts` (60 lines) - Use case orchestration

---

#### 7. `src/routes/api/predictions/+server.ts` (126 lines) 🟡

**What it does**:
- Submits scoreline predictions
- Validates scores
- Prevents duplicate submissions
- Handles referrals

**Problems**:
1. **Manual Validation**: No Zod schema
2. **Complex Logic**: Update vs insert logic inline
3. **No Rate Limiting**: Can spam predictions
4. **Type Safety**: Uses `any` types

**How to improve**:

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
  // ... manual validation
```

**After**:
```typescript
import { validateBody } from '$lib/server/middleware/validation.middleware';
import { predictionSchema } from '$lib/shared/validation/schemas/event.schema';
import { SubmitPrediction } from '$lib/application/tasks/SubmitPrediction.usecase';

export const POST: RequestHandler = async ({ request, locals }) => {
  const validated = await validateBody(request, predictionSchema);
  
  const useCase = new SubmitPrediction();
  const result = await useCase.execute(validated, locals.user.id);
  
  return json({ success: true, data: result });
};
```

---

### Server-Side Code

#### 8. `src/lib/server/rateLimit.ts` (110 lines) 🔴

**What it does**:
- In-memory rate limiting
- Auto-cleanup of old entries

**Problems**:
1. **In-Memory Only**: Resets on server restart
2. **Not Distributed**: Won't work with multiple servers/serverless
3. **No Persistence**: Lost on deploy

**How to replace**:

Use Redis-based rate limiting (already documented in blueprint).

**Migration**:
1. Set up Upstash Redis
2. Create new `RateLimiter.ts` with Redis
3. Replace all imports
4. Test rate limiting
5. Delete old file

---

### Database

#### 9. `src/lib/db schema` (294 lines) 🟡

**What it does**:
- Defines database schema
- Users, events, tasks, submissions tables
- Triggers for auth sync

**Problems**:
1. **Inconsistent Task Storage**: Tasks in both JSONB (events table) AND separate table
2. **No Foreign Keys**: task_submissions references tasks that might not exist
3. **JSONB Performance**: Querying JSON fields is slow
4. **No Indexing**: Missing indexes on common queries

**Schema Issues**:

**Current** (Inconsistent):
```sql
CREATE TABLE events (
    tasks jsonb NOT NULL  -- Tasks stored as JSON
);

CREATE TABLE tasks (
    id uuid PRIMARY KEY,
    event_id uuid REFERENCES events(id),
    config jsonb NOT NULL
);

CREATE TABLE task_submissions (
    task_id uuid REFERENCES tasks(id),  -- But tasks might be in JSON!
    submission jsonb NOT NULL
);
```

**Target** (Normalized):
```sql
CREATE TABLE events (
    id uuid PRIMARY KEY,
    title text NOT NULL,
    -- No tasks JSONB
);

CREATE TABLE tasks (
    id uuid PRIMARY KEY,
    event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text,
    config jsonb NOT NULL,
    points integer DEFAULT 0,
    required boolean DEFAULT false,
    order_index integer DEFAULT 0
);

CREATE INDEX idx_tasks_event ON tasks(event_id);
CREATE INDEX idx_tasks_type ON tasks(type);

CREATE TABLE task_submissions (
    id uuid PRIMARY KEY,
    task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    submission jsonb NOT NULL,
    verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_submissions_user_task ON task_submissions(user_id, task_id);
CREATE INDEX idx_submissions_event ON task_submissions(event_id);
CREATE INDEX idx_submissions_verified ON task_submissions(verified);
```

**Migration Plan**:
1. Create new `tasks` table structure
2. Migrate data from events.tasks JSONB to tasks table
3. Update all queries to use new structure
4. Add foreign key constraints
5. Drop tasks column from events
6. Test thoroughly

---

## 🎯 PRIORITY MATRIX

### Fix Immediately (Week 1-2)

| File | Issue | Impact | Effort |
|------|-------|--------|--------|
| `verify-twitter/+server.ts` | In-memory rate limit | Security | 2 hours |
| `events/+server.ts` | No validation | Security | 1 hour |
| `predictions/+server.ts` | No validation | Security | 1 hour |
| All API routes | No rate limiting | Security | 4 hours |

### Fix Soon (Week 3-4)

| File | Issue | Impact | Effort |
|------|-------|--------|--------|
| All API routes | No repository pattern | Maintainability | 2 days |
| `rateLimit.ts` | In-memory only | Scalability | 3 hours |
| All routes | No error standardization | UX | 1 day |

### Fix Later (Week 5-8)

| File | Issue | Impact | Effort |
|------|-------|--------|--------|
| `events/[id]/+page.svelte` | 1,453 lines | Maintainability | 1 week |
| `create-event/+page.svelte` | 2,819 lines | Maintainability | 2 weeks |
| `+layout.svelte` | Mixed concerns | Maintainability | 3 days |
| `db schema` | Inconsistent structure | Performance | 1 week |

---

## 📊 IMPACT ANALYSIS

### Before Restructure

**Development Speed**:
- Add new task type: 2-3 hours (finding code, updating registry, testing)
- Fix bug in event page: 1-2 hours (finding root cause in 1,453 lines)
- Add API endpoint: 1 hour (no patterns to follow)
- Onboard new developer: 2 weeks (too complex to understand)

**Security**:
- ❌ No input validation on most endpoints
- ❌ In-memory rate limiting (not production-ready)
- ❌ No CSRF protection
- ❌ SQL injection possible through JSONB queries

**Performance**:
- ⚠️ No caching (every request hits database)
- ⚠️ Large bundle size (2,819 line components loaded at once)
- ⚠️ Slow queries (no indexes on JSONB)
- ⚠️ No lazy loading

**Maintainability**:
- ❌ Can't test components in isolation
- ❌ Duplicate code everywhere
- ❌ No clear architecture
- ❌ Type safety poor (`any` everywhere)

### After Restructure

**Development Speed**:
- Add new task type: 15 minutes (clear pattern, type-safe)
- Fix bug: 15-30 minutes (isolated components, clear structure)
- Add API endpoint: 20 minutes (copy pattern, add validation schema)
- Onboard new developer: 2-3 days (clear architecture, well-documented)

**Security**:
- ✅ All inputs validated with Zod
- ✅ Redis-based rate limiting (production-ready)
- ✅ CSRF protection on all mutations
- ✅ SQL injection prevented (no raw queries)

**Performance**:
- ✅ Redis caching (80% cache hit rate)
- ✅ Small bundle size (lazy loaded components)
- ✅ Fast queries (proper indexes)
- ✅ Lazy loading everywhere

**Maintainability**:
- ✅ Every component testable
- ✅ No code duplication
- ✅ Clean architecture
- ✅ Full type safety

---

## 🔄 MIGRATION SEQUENCE

Follow this exact order to minimize risk:

### Week 1: Security Foundation
1. ✅ Install dependencies
2. ✅ Create shared types (DONE)
3. ✅ Create error classes (DONE)
4. ⏳ Create validation schemas
5. ⏳ Apply to 3 API routes (test)
6. ⏳ Roll out to all API routes

### Week 2: Error Handling
1. ⏳ Replace all `throw error()` with custom errors
2. ⏳ Add try-catch to all routes
3. ⏳ Test error responses
4. ⏳ Update frontend error handling

### Week 3: Rate Limiting
1. ⏳ Set up Upstash Redis
2. ⏳ Create RateLimiter class
3. ⏳ Apply to verification endpoints
4. ⏳ Apply to creation endpoints
5. ⏳ Test rate limits
6. ⏳ Remove old rateLimit.ts

### Week 4: Repository Pattern
1. ⏳ Create EventRepository
2. ⏳ Create TaskRepository
3. ⏳ Create UserRepository
4. ⏳ Replace Supabase calls in 1 route (test)
5. ⏳ Roll out to all routes
6. ⏳ Add caching layer

### Week 5-8: Database Migration
1. ⏳ Create new tasks table structure
2. ⏳ Write migration script
3. ⏳ Test migration on staging
4. ⏳ Run migration on production
5. ⏳ Update all queries
6. ⏳ Verify data integrity

### Week 9-12: Component Extraction
1. ⏳ Extract EventHeader (test with original page)
2. ⏳ Extract TaskList
3. ⏳ Extract TaskCard
4. ⏳ Extract RewardsList
5. ⏳ Update event detail page
6. ⏳ Extract form wizard components
7. ⏳ Update create-event page
8. ⏳ Extract layout components
9. ⏳ Update +layout.svelte

### Week 13-16: Performance
1. ⏳ Implement Redis caching
2. ⏳ Add lazy loading
3. ⏳ Optimize bundle size
4. ⏳ Add service workers
5. ⏳ Performance testing
6. ⏳ Load testing

---

## ✅ VERIFICATION CHECKLIST

After each week, verify:

**Week 1: Security**
- [ ] All API routes have Zod validation
- [ ] Try submitting invalid data - should get 422 error
- [ ] Error messages are descriptive
- [ ] No `any` types in request handlers

**Week 2: Error Handling**
- [ ] All routes use custom error classes
- [ ] Error responses follow standard format
- [ ] Frontend displays errors nicely
- [ ] No generic "Server error" messages

**Week 3: Rate Limiting**
- [ ] Redis connection working
- [ ] Rate limits trigger correctly
- [ ] Rate limit errors have TTL info
- [ ] Dashboard shows rate limit metrics

**Week 4: Repository Pattern**
- [ ] No direct Supabase calls in routes
- [ ] All queries in repository methods
- [ ] Queries are reusable
- [ ] Error handling consistent

**Week 5-8: Database**
- [ ] Migration completed successfully
- [ ] All data migrated correctly
- [ ] Foreign keys working
- [ ] Queries faster than before
- [ ] No JSONB queries in hot paths

**Week 9-12: Components**
- [ ] event detail page < 200 lines
- [ ] create-event page < 250 lines
- [ ] +layout.svelte < 150 lines
- [ ] All components < 200 lines
- [ ] Components reusable
- [ ] No duplicate code

**Week 13-16: Performance**
- [ ] Lighthouse score > 90
- [ ] Cache hit rate > 70%
- [ ] Time to Interactive < 3s
- [ ] Bundle size < 500KB
- [ ] API response < 200ms (cached)

---

## 📝 SUMMARY

**Current State**:
- 31 API routes with inconsistent patterns
- 15 page components, 3 are monolithic (>500 lines)
- Mixed concerns everywhere
- Security vulnerabilities
- Performance issues
- Hard to maintain

**Target State**:
- Clean layered architecture
- All files < 300 lines
- Security by default
- Fast & cached
- Easy to maintain

**Timeline**: 16 weeks
**Risk**: Low (gradual migration)
**ROI**: 10x faster development

---

**Ready to start? Begin with Week 1 validation schemas!** 🚀
