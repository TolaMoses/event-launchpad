# Architecture Refactor Plan

## Executive Summary
The current codebase has grown organically and exhibits several architectural anti-patterns that hinder maintainability, testability, and scalability. This document outlines a comprehensive plan to refactor the codebase into a clean, modular architecture.

## Current Issues

### 1. Duplicate Task Registry Systems ⚠️ CRITICAL
**Location**: 
- `src/lib/tasks/index.ts` 
- `src/lib/tasks/taskRegistry.ts`

**Problem**: Two competing registries with different structures
**Impact**: Inconsistent task handling across pages, confusion for developers
**Priority**: CRITICAL - Must fix immediately

### 2. Scattered Data Access 🔴 HIGH
**Problem**: Database queries mixed throughout components and API routes
**Examples**:
- Direct Supabase calls in `events/[id]/+page.svelte`
- Query logic duplicated in multiple files
- No centralized data access layer

**Impact**: 
- Hard to optimize queries
- Difficult to test
- Cannot easily switch databases
- Duplicated logic

### 3. Monolithic Components 🟡 MEDIUM
**Problem**: Components with 1000+ lines mixing concerns
**Examples**:
- `routes/events/[id]/+page.svelte` (1452 lines)
- `routes/projects/create-event/+page.svelte` (2819 lines)

**Impact**:
- Difficult to understand
- Hard to test
- Poor reusability
- Slow development velocity

### 4. Inconsistent Error Handling 🟡 MEDIUM
**Problem**: No standardized error handling approach
**Examples**:
- Some use try-catch
- Others rely on error objects
- No custom error types
- Inconsistent API responses

### 5. Weak Type Safety 🟡 MEDIUM
**Problem**: Overuse of loose types
**Examples**:
- `Record<string, unknown>`
- `any` types
- No shared domain models

### 6. No Clear Boundaries 🟠 LOW
**Problem**: Business logic, UI, and data access all mixed together
**Impact**: Difficult to maintain and scale

---

## Proposed Architecture

### Layered Architecture Pattern

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │  ← Svelte components, stores
│  (UI Components, Routes, Stores)        │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│        Application Layer                │  ← Use cases, workflows
│   (Use Cases, Application Services)     │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│          Domain Layer                   │  ← Business logic
│  (Entities, Services, Validators)       │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│      Infrastructure Layer               │  ← External services
│  (Database, API, Storage, Blockchain)   │
└─────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── lib/
│   ├── domain/                    # BUSINESS LOGIC
│   │   ├── events/
│   │   │   ├── models/
│   │   │   │   ├── Event.ts              # Event entity
│   │   │   │   ├── EventStatus.ts        # Event status enum
│   │   │   │   └── types.ts              # Event-related types
│   │   │   ├── services/
│   │   │   │   ├── EventService.ts       # Event business logic
│   │   │   │   ├── EventValidator.ts     # Event validation
│   │   │   │   └── EventPublisher.ts     # Publish workflow
│   │   │   └── repositories/
│   │   │       └── EventRepository.ts    # Event data access interface
│   │   ├── tasks/
│   │   │   ├── models/
│   │   │   │   ├── Task.ts
│   │   │   │   ├── TaskType.ts
│   │   │   │   └── types.ts
│   │   │   ├── services/
│   │   │   │   ├── TaskService.ts
│   │   │   │   ├── TaskVerifier.ts
│   │   │   │   └── TaskSubmissionService.ts
│   │   │   ├── repositories/
│   │   │   │   └── TaskRepository.ts
│   │   │   └── registry/
│   │   │       └── TaskRegistry.ts       # SINGLE task registry
│   │   ├── users/
│   │   ├── rewards/
│   │   └── referrals/
│   │
│   ├── infrastructure/            # EXTERNAL SERVICES
│   │   ├── database/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts
│   │   │   │   ├── admin.ts
│   │   │   │   └── queries/              # Query builders
│   │   │   └── repositories/             # Concrete implementations
│   │   │       ├── SupabaseEventRepository.ts
│   │   │       └── SupabaseTaskRepository.ts
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   └── interceptors.ts
│   │   ├── storage/
│   │   │   └── fileUpload.ts
│   │   └── blockchain/
│   │       └── contracts.ts
│   │
│   ├── application/               # USE CASES
│   │   ├── events/
│   │   │   ├── createEvent.usecase.ts
│   │   │   ├── updateEvent.usecase.ts
│   │   │   ├── publishEvent.usecase.ts
│   │   │   ├── getEventDetails.usecase.ts
│   │   │   └── listEvents.usecase.ts
│   │   ├── tasks/
│   │   │   ├── createTask.usecase.ts
│   │   │   ├── submitTask.usecase.ts
│   │   │   ├── verifyTask.usecase.ts
│   │   │   └── listTasks.usecase.ts
│   │   └── auth/
│   │       ├── login.usecase.ts
│   │       └── register.usecase.ts
│   │
│   ├── presentation/              # UI LAYER
│   │   ├── components/
│   │   │   ├── ui/                       # Generic UI components
│   │   │   │   ├── Button.svelte
│   │   │   │   ├── Card.svelte
│   │   │   │   ├── Input.svelte
│   │   │   │   └── Modal.svelte
│   │   │   ├── features/                 # Feature components
│   │   │   │   ├── events/
│   │   │   │   │   ├── EventCard.svelte
│   │   │   │   │   ├── EventForm.svelte
│   │   │   │   │   ├── EventDetails.svelte
│   │   │   │   │   └── EventList.svelte
│   │   │   │   ├── tasks/
│   │   │   │   │   ├── TaskCard.svelte
│   │   │   │   │   ├── TaskForm.svelte
│   │   │   │   │   ├── TaskList.svelte
│   │   │   │   │   └── task-types/       # Task type components
│   │   │   │   │       ├── TwitterTask.svelte
│   │   │   │   │       ├── DiscordTask.svelte
│   │   │   │   │       ├── QuizTask.svelte
│   │   │   │   │       └── ReferralTask.svelte
│   │   │   │   └── rewards/
│   │   │   │       ├── RewardCard.svelte
│   │   │   │       └── RewardBuilder.svelte
│   │   │   └── layouts/
│   │   │       ├── AppLayout.svelte
│   │   │       └── AdminLayout.svelte
│   │   ├── stores/                       # State management
│   │   │   ├── auth.store.ts
│   │   │   ├── events.store.ts
│   │   │   └── tasks.store.ts
│   │   └── utils/                        # UI utilities
│   │       ├── formatters.ts
│   │       └── validators.ts
│   │
│   ├── shared/                    # SHARED CODE
│   │   ├── types/                        # Shared TypeScript types
│   │   │   ├── api.types.ts
│   │   │   ├── common.types.ts
│   │   │   └── index.ts
│   │   ├── constants/
│   │   │   ├── app.constants.ts
│   │   │   └── api.constants.ts
│   │   ├── utils/
│   │   │   ├── date.utils.ts
│   │   │   ├── string.utils.ts
│   │   │   └── validation.utils.ts
│   │   └── errors/                       # Custom error classes
│   │       ├── ApiError.ts
│   │       ├── ValidationError.ts
│   │       └── index.ts
│   │
│   └── config/                    # CONFIGURATION
│       ├── app.config.ts
│       ├── assets.config.ts
│       └── env.config.ts
│
├── routes/                        # SVELTEKIT ROUTES (Thin controllers)
│   ├── (app)/                            # App routes group
│   │   ├── events/
│   │   │   ├── [id]/
│   │   │   │   └── +page.svelte          # ~100 lines max
│   │   │   └── +page.svelte
│   │   ├── dashboard/
│   │   │   └── +page.svelte
│   │   └── profile/
│   │       └── +page.svelte
│   ├── (admin)/                          # Admin routes group
│   │   └── admin/
│   ├── api/                              # API routes (thin handlers)
│   │   ├── events/
│   │   │   ├── +server.ts                # ~50 lines max
│   │   │   └── [id]/
│   │   ├── tasks/
│   │   └── auth/
│   └── auth/
│
└── hooks.server.ts
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2) 🔴 CRITICAL

#### Step 1.1: Create Shared Types
**File**: `src/lib/shared/types/index.ts`

```typescript
// Domain types
export interface Event {
  id: string;
  title: string;
  description: string;
  // ... all event properties
}

export interface Task {
  id: string;
  type: TaskType;
  config: TaskConfig;
  // ... all task properties
}

export interface User {
  id: string;
  username: string;
  // ... all user properties
}

// API types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
```

**Benefits**:
- Type safety across entire app
- Single source of truth
- Better IDE autocomplete

#### Step 1.2: Consolidate Task Registry ⚠️ URGENT
**Action**: Merge `index.ts` and `taskRegistry.ts`

**New file**: `src/lib/domain/tasks/registry/TaskRegistry.ts`

```typescript
import type { ComponentType } from 'svelte';

export interface TaskRegistryEntry {
  label: string;
  component: ComponentType;
  icon: string;
  category: TaskCategory;
}

export type TaskType = 
  | 'twitter' 
  | 'discord' 
  | 'telegram' 
  | 'quiz' 
  | 'puzzle'
  | 'content_submission'
  | 'referral'
  | 'scoreline_prediction';

export type TaskCategory = 'Social' | 'Quiz & Games' | 'Predictions' | 'Content' | 'Challenges' | 'Referral';

// Single registry - import from one place
export const TASK_REGISTRY: Record<TaskType, TaskRegistryEntry> = {
  // ... all tasks
};
```

**Migration steps**:
1. Create new `TaskRegistry.ts`
2. Move all task type components to `presentation/components/features/tasks/task-types/`
3. Update all imports to use new registry
4. Delete old `index.ts` and `taskRegistry.ts`

#### Step 1.3: Error Handling System
**File**: `src/lib/shared/errors/index.ts`

```typescript
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}
```

#### Step 1.4: Repository Pattern
**File**: `src/lib/domain/events/repositories/EventRepository.ts`

```typescript
// Interface (domain layer)
export interface IEventRepository {
  findById(id: string): Promise<Event | null>;
  findAll(filters?: EventFilters): Promise<Event[]>;
  create(event: CreateEventDto): Promise<Event>;
  update(id: string, data: Partial<Event>): Promise<Event>;
  delete(id: string): Promise<void>;
}

// Implementation (infrastructure layer)
// File: src/lib/infrastructure/database/repositories/SupabaseEventRepository.ts
export class SupabaseEventRepository implements IEventRepository {
  constructor(private client: SupabaseClient) {}

  async findById(id: string): Promise<Event | null> {
    const { data, error } = await this.client
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundError('Event');
    return data as Event;
  }

  // ... other methods
}
```

---

### Phase 2: Data Layer (Week 3-4)

#### Extract Database Queries
- Create repository for each domain entity
- Move all Supabase queries to repositories
- Implement query builders for complex queries

**Example**: Extract event queries from `events/[id]/+page.svelte`

**Before** (in component):
```typescript
const { data: event } = await supabase
  .from('events')
  .select('*')
  .eq('id', eventId)
  .single();
```

**After** (in repository):
```typescript
// In component
import { eventRepository } from '$lib/infrastructure/database/repositories';
const event = await eventRepository.findById(eventId);
```

---

### Phase 3: Business Logic (Week 5-6)

#### Create Service Layer
**File**: `src/lib/domain/tasks/services/TaskService.ts`

```typescript
export class TaskService {
  constructor(
    private taskRepository: ITaskRepository,
    private taskValidator: TaskValidator
  ) {}

  async verifyTaskCompletion(
    taskId: string, 
    userId: string, 
    submission: TaskSubmission
  ): Promise<boolean> {
    // Business logic here
    const task = await this.taskRepository.findById(taskId);
    
    if (!task) {
      throw new NotFoundError('Task');
    }

    // Validate submission
    const isValid = await this.taskValidator.validate(task, submission);
    
    if (!isValid) {
      throw new ValidationError('Invalid task submission');
    }

    // Verify with external service if needed
    if (task.type === 'twitter') {
      return await this.verifyTwitterTask(task, submission);
    }

    return true;
  }
}
```

---

### Phase 4: Component Refactor (Week 7-8)

#### Break Down Large Components

**Before**: 1452-line `events/[id]/+page.svelte`

**After**: Multiple focused components
```svelte
<!-- events/[id]/+page.svelte - ~80 lines -->
<script lang="ts">
  import EventDetails from '$lib/presentation/components/features/events/EventDetails.svelte';
  import TaskList from '$lib/presentation/components/features/tasks/TaskList.svelte';
  import { getEventDetails } from '$lib/application/events/getEventDetails.usecase';
  
  let event = getEventDetails(eventId);
</script>

<EventDetails {event} />
<TaskList tasks={event.tasks} />
```

---

## Success Metrics

### Technical Metrics
- ✅ Reduce average component size from 800 to < 200 lines
- ✅ Achieve 80%+ type coverage (reduce `any` usage)
- ✅ Centralize 100% of database queries in repositories
- ✅ Single task registry (eliminate duplication)

### Developer Experience
- ✅ New developers can onboard in < 2 hours
- ✅ Adding new task types takes < 30 minutes
- ✅ Tests can be written for business logic
- ✅ Code review time reduced by 50%

### Code Quality
- ✅ Zero duplicate code for common operations
- ✅ Consistent error handling across app
- ✅ Clear separation of concerns
- ✅ Testable code (unit tests possible)

---

## Migration Strategy

### Principle: Strangler Fig Pattern
- Don't rewrite everything at once
- Build new architecture alongside old
- Gradually migrate features
- Old and new coexist temporarily

### Week-by-Week Breakdown

**Week 1-2**: Foundation
- Create folder structure
- Build shared types
- Consolidate task registry
- Set up error handling

**Week 3-4**: Data layer
- Create repositories
- Migrate database queries
- One domain at a time (start with Events)

**Week 5-6**: Business logic
- Extract services
- Move validation logic
- Create use cases

**Week 7-8**: Components
- Extract UI components
- Break down pages
- Create feature components

**Week 9-10**: Polish
- Add tests
- Documentation
- Performance optimization

---

## Risk Mitigation

### Risks
1. **Breaking existing features** → Gradual migration, feature flags
2. **Team resistance** → Clear documentation, pair programming
3. **Time overrun** → Prioritize critical paths first
4. **Scope creep** → Stick to plan, no new features during refactor

### Rollback Strategy
- Keep old code until new code is proven
- Use feature flags for gradual rollout
- Maintain git branches for easy rollback

---

## Conclusion

This refactor will:
- ✅ Eliminate duplicate code and confusion
- ✅ Make the codebase maintainable and scalable
- ✅ Enable team to move faster with confidence
- ✅ Improve code quality and reduce bugs

**Next Steps**:
1. Review and approve this plan
2. Create Phase 1 tasks
3. Begin implementation
4. Weekly progress reviews
