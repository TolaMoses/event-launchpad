# Architecture Refactor - Quick Start Guide

## 🚨 Critical Issues Found

### 1. **DUPLICATE TASK REGISTRIES** ⚠️ FIX IMMEDIATELY
**Location**:
- ❌ `src/lib/tasks/index.ts` (old registry)
- ❌ `src/lib/tasks/taskRegistry.ts` (new registry)

**Problem**: Different pages import different registries
- `create-event/+page.svelte` uses `$lib/tasks` (old)
- `events/[id]/+page.svelte` uses `$lib/tasks/taskRegistry` (new)

**Impact**: Tasks may behave differently on different pages!

**Quick Fix** (30 minutes):
```typescript
// 1. Update create-event page import
// Change:
import { taskRegistry } from "$lib/tasks";
// To:
import { taskRegistry } from "$lib/tasks/taskRegistry";

// 2. Delete old registry
rm src/lib/tasks/index.ts

// 3. Move old task components to new locations
```

### 2. **1000+ LINE COMPONENTS** 🔴 REFACTOR SOON
**Files**:
- `routes/events/[id]/+page.svelte` - 1452 lines
- `routes/projects/create-event/+page.svelte` - 2819 lines

**Problem**: Too much mixed together (UI + logic + data)

**Quick Win**: Extract task display logic to separate components

### 3. **NO TYPE SAFETY** 🟡 IMPROVE GRADUALLY  
**Examples**:
```typescript
// ❌ Bad
let config: Record<string, unknown> = {};

// ✅ Good (now available)
import type { TaskConfig } from '$lib/shared/types';
let config: TaskConfig = {};
```

---

## ✅ What's Been Created For You

### 1. **Shared Types** (`src/lib/shared/types/index.ts`)
Single source of truth for all types:
```typescript
import type { 
  Event, 
  Task, 
  User, 
  TaskConfig,
  ApiResponse 
} from '$lib/shared/types';
```

**Start using these TODAY**:
- Replace `Record<string, unknown>` with proper types
- Use `Event` type instead of inline interfaces
- Use `ApiResponse<T>` for API endpoints

### 2. **Error Handling** (`src/lib/shared/errors/index.ts`)
Professional error handling:
```typescript
import { 
  NotFoundError, 
  ValidationError,
  UnauthorizedError 
} from '$lib/shared/errors';

// ❌ Before
if (!event) {
  throw error(404, 'Event not found');
}

// ✅ After
if (!event) {
  throw new NotFoundError('Event');
}
```

**Benefits**:
- Consistent error codes
- Proper HTTP status codes
- Better error messages
- Type-safe error handling

### 3. **Architecture Plan** (`ARCHITECTURE_REFACTOR_PLAN.md`)
Complete roadmap for refactoring

---

## 🎯 Your Action Plan - Next 2 Weeks

### Week 1: Fix Critical Issues

#### Day 1-2: Consolidate Task Registry ⚠️ URGENT
```bash
# Tasks:
1. Update all imports to use taskRegistry.ts
2. Delete old index.ts
3. Test that all pages work
4. Commit: "fix: consolidate task registries"
```

**Files to update**:
- [ ] `src/routes/projects/create-event/+page.svelte`
- [ ] Delete `src/lib/tasks/index.ts`
- [ ] Update any other files importing from `$lib/tasks`

#### Day 3-4: Add Type Safety to Critical Paths
```bash
# Tasks:
1. Update event detail page types
2. Update create event page types
3. Update API endpoints with proper types
4. Commit: "feat: add shared types"
```

**Example migration**:
```typescript
// Before
let event: any;

// After  
import type { Event } from '$lib/shared/types';
let event: Event;
```

#### Day 5: Standardize Error Handling
```bash
# Tasks:
1. Update API routes to use custom errors
2. Update event detail page error handling
3. Test error scenarios
4. Commit: "feat: standardize error handling"
```

**Example migration**:
```typescript
// Before - in API route
if (!event) {
  throw error(404, 'Event not found');
}

// After
import { EventNotFoundError } from '$lib/shared/errors';
if (!event) {
  throw new EventNotFoundError(eventId);
}
```

### Week 2: Start Modularization

#### Day 1-3: Extract Event Repository
Create `src/lib/infrastructure/database/repositories/EventRepository.ts`:

```typescript
import type { Event, EventFilters } from '$lib/shared/types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import { EventNotFoundError, mapSupabaseError } from '$lib/shared/errors';

export class EventRepository {
  async findById(id: string): Promise<Event> {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw mapSupabaseError(error);
    if (!data) throw new EventNotFoundError(id);
    
    return data as Event;
  }

  async findAll(filters?: EventFilters): Promise<Event[]> {
    let query = supabaseAdmin.from('events').select('*');
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.event_type) {
      query = query.eq('event_type', filters.event_type);
    }

    const { data, error } = await query;
    
    if (error) throw mapSupabaseError(error);
    return data as Event[];
  }

  async create(event: Partial<Event>): Promise<Event> {
    const { data, error } = await supabaseAdmin
      .from('events')
      .insert(event)
      .select()
      .single();

    if (error) throw mapSupabaseError(error);
    return data as Event;
  }

  // Add more methods...
}

// Export singleton
export const eventRepository = new EventRepository();
```

**Then update your API routes**:
```typescript
// Before
const { data: event } = await supabaseAdmin
  .from('events')
  .select('*')
  .eq('id', eventId)
  .single();

// After
import { eventRepository } from '$lib/infrastructure/database/repositories/EventRepository';
const event = await eventRepository.findById(eventId);
```

#### Day 4-5: Extract Components
Break down `events/[id]/+page.svelte`:

```
Create:
- EventHeader.svelte (event title, description, dates)
- EventBanner.svelte (banner image)
- TaskList.svelte (list of tasks)
- TaskCard.svelte (individual task display)
- RewardsList.svelte (list of rewards)
```

**Example**:
```svelte
<!-- Before: Everything in +page.svelte (1452 lines) -->

<!-- After: Clean page component (~100 lines) -->
<script lang="ts">
  import EventHeader from '$lib/presentation/components/features/events/EventHeader.svelte';
  import TaskList from '$lib/presentation/components/features/tasks/TaskList.svelte';
  import RewardsList from '$lib/presentation/components/features/rewards/RewardsList.svelte';
  
  export let data;
  const { event } = data;
</script>

<EventHeader {event} />
<TaskList tasks={event.tasks} />
<RewardsList rewards={event.rewards} />
```

---

## 📊 Success Metrics

Track your progress:

### Week 1
- [ ] Task registry consolidated (single source)
- [ ] Shared types used in 5+ files
- [ ] Custom errors used in all API routes
- [ ] Zero `any` types in new code

### Week 2  
- [ ] EventRepository created and working
- [ ] Event detail page split into 5+ components
- [ ] Each component < 200 lines
- [ ] All database queries in repositories

---

## 🛠️ Development Workflow

### Before Making Changes
```bash
# Create feature branch
git checkout -b refactor/consolidate-task-registry

# Make changes
# ...

# Test thoroughly
npm run dev
# Test all affected pages

# Commit with descriptive message
git add .
git commit -m "refactor: consolidate task registries into single source"

# Push and create PR
git push origin refactor/consolidate-task-registry
```

### Code Review Checklist
- [ ] Types are properly defined (no `any` or `unknown`)
- [ ] Errors use custom error classes
- [ ] Components are < 200 lines
- [ ] No duplicate code
- [ ] Database queries in repositories
- [ ] Tests added (if applicable)

---

## 🚀 Quick Wins You Can Do TODAY

### 1. Fix Task Registry (30 min)
```bash
# In src/routes/projects/create-event/+page.svelte
# Line 12: Change this
import { taskRegistry } from "$lib/tasks";
# To this:
import { taskRegistry } from "$lib/tasks/taskRegistry";
```

### 2. Add Types to Event Detail (15 min)
```typescript
// In src/routes/events/[id]/+page.svelte
// Add at top:
import type { Event, Task, TaskSubmission } from '$lib/shared/types';

// Update variables:
let event: Event | null = null;
let taskSubmissions: Record<string, TaskSubmission> = {};
```

### 3. Update One API Route (10 min)
```typescript
// In any +server.ts file
import { NotFoundError, ValidationError } from '$lib/shared/errors';
import { formatErrorResponse } from '$lib/shared/errors';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // ... your code
    
    if (!data) {
      throw new NotFoundError('Resource');
    }
    
    return json({ success: true, data });
  } catch (error) {
    return json(formatErrorResponse(error), { status: 500 });
  }
};
```

---

## 💡 Tips

### DOs ✅
- Use shared types everywhere
- Create small, focused components
- Put database queries in repositories
- Use custom error classes
- Write descriptive commit messages

### DON'Ts ❌
- Don't create new `any` or `unknown` types
- Don't put database queries in components
- Don't create components > 300 lines
- Don't duplicate code
- Don't mix concerns (UI + logic + data)

---

## 📚 Resources

- **Architecture Plan**: `ARCHITECTURE_REFACTOR_PLAN.md`
- **Shared Types**: `src/lib/shared/types/index.ts`
- **Error Classes**: `src/lib/shared/errors/index.ts`

---

## 🆘 Need Help?

### Common Questions

**Q: Which task registry should I use?**
A: Always use `$lib/tasks/taskRegistry`. The old `$lib/tasks/index.ts` will be deleted.

**Q: Where do I put new types?**
A: Add them to `src/lib/shared/types/index.ts`

**Q: How do I handle errors in API routes?**
A: Use custom error classes from `$lib/shared/errors`

**Q: Can I refactor everything at once?**
A: No! Do it gradually. Start with critical issues.

**Q: What if I break something?**
A: That's why we use git branches and test thoroughly before merging.

---

## Next Steps

1. ✅ Read this guide
2. ⚠️ Fix task registry duplication (TODAY)
3. 📝 Start using shared types
4. 🔧 Implement error handling
5. 📖 Read full architecture plan
6. 🚀 Begin Week 1 tasks

**Remember**: Small, incremental changes are better than big rewrites!
