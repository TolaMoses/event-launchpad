# 🧹 Codebase Cleanup & Refactoring Plan

## Current Issues Identified

### 1. **Large Files** (2,500+ lines)
- ❌ `src/routes/projects/create-event/+page.svelte` - **2,819 lines** (81KB)
- ❌ `src/routes/events/[id]/+page.svelte` - **~1,000+ lines** (34.5KB)

### 2. **Deprecated Files** (Old in-memory implementations)
- ❌ `src/lib/server/nonceStore.ts` - Replaced by Redis
- ❌ `src/lib/server/rateLimit.ts` - Replaced by Redis

### 3. **Files Still Using Deprecated Code**
- ❌ `src/routes/api/auth/message/+server.ts` - Uses old nonceStore
- ❌ `src/routes/api/tasks/verify-discord/+server.ts` - Uses old rateLimit
- ❌ `src/routes/api/tasks/verify-telegram/+server.ts` - Uses old rateLimit

### 4. **Duplicate Task Components**
- ⚠️  Task components exist in TWO places:
  - `src/lib/tasks/components/` (newer)
  - `src/lib/tasks/{social,content,quiz,etc}/` (legacy)

---

## 🎯 Refactoring Strategy

### Phase 1: Update Remaining Endpoints ✅
1. Update verify-discord endpoint
2. Update verify-telegram endpoint
3. Update auth/message endpoint (or remove if unused)

### Phase 2: Remove Deprecated Files ✅
1. Delete `src/lib/server/nonceStore.ts`
2. Delete `src/lib/server/rateLimit.ts`

### Phase 3: Break Down Large Files ✅
1. Extract types from create-event page
2. Extract reward configuration logic
3. Extract form validation logic
4. Create smaller, focused components

### Phase 4: Clean Up Task Components ✅
1. Move all task logic to `src/lib/tasks/components/`
2. Remove legacy task component folders
3. Update CONSOLIDATED_taskRegistry.ts

---

## 📁 Proposed New Structure

```
src/lib/
├── components/           # Shared UI components
│   ├── LoginDropdown.svelte
│   ├── RewardBuilder.svelte
│   ├── TaskBuilder.svelte        # NEW: Extract from create-event
│   ├── EventForm.svelte          # NEW: Extract from create-event
│   └── ...
│
├── config/               # Configuration
│   ├── assets.ts
│   ├── rewards.ts               # NEW: Reward type configs
│   └── tasks.ts                 # NEW: Task type configs
│
├── infrastructure/       # External services
│   └── redis/
│       ├── client.ts
│       ├── rateLimiter.ts
│       ├── idempotency.ts
│       └── nonces.ts
│
├── server/               # Server-only code
│   ├── middleware/
│   │   ├── rateLimit.ts
│   │   └── validation.ts
│   ├── supabaseAdmin.ts
│   └── session.ts
│
├── shared/               # Shared types and validation
│   ├── types/
│   │   ├── index.ts
│   │   ├── event.types.ts       # NEW: Event-specific types
│   │   ├── task.types.ts        # NEW: Task-specific types
│   │   └── reward.types.ts      # NEW: Reward-specific types
│   ├── validation/
│   │   └── schemas/
│   │       ├── event.schema.ts
│   │       ├── task.schema.ts
│   │       └── user.schema.ts
│   └── errors/
│       └── index.ts
│
└── tasks/                # Task system
    ├── components/       # All task components here
    │   ├── TwitterTask.svelte
    │   ├── DiscordTask.svelte
    │   ├── TelegramTask.svelte
    │   ├── QuizTask.svelte
    │   ├── PuzzleTask.svelte
    │   ├── ContentTask.svelte
    │   ├── ReferralTask.svelte
    │   └── ScorelineTask.svelte
    ├── CONSOLIDATED_taskRegistry.ts
    ├── index.ts
    └── TaskTypes.ts
```

---

## 🗑️ Files to DELETE

### Old In-Memory Implementations
- `src/lib/server/nonceStore.ts`
- `src/lib/server/rateLimit.ts`

### Legacy Task Component Folders (after consolidation)
- `src/lib/tasks/social/`
- `src/lib/tasks/content/`
- `src/lib/tasks/quiz/`
- `src/lib/tasks/puzzle/`
- `src/lib/tasks/participation/`
- `src/lib/tasks/game/`
- `src/lib/tasks/referral/`
- `src/lib/tasks/irl/`
- `src/lib/tasks/scoreline/`

---

## 📝 Implementation Steps

### Step 1: Update Remaining Endpoints
- [ ] Update verify-discord
- [ ] Update verify-telegram  
- [ ] Check if auth/message is needed

### Step 2: Clean Up Large Files
- [ ] Extract types from create-event
- [ ] Create EventForm component
- [ ] Create TaskBuilder component
- [ ] Create RewardConfig component

### Step 3: Consolidate Task Components
- [ ] Verify all components work from /components/
- [ ] Update registry to only use /components/
- [ ] Delete legacy folders

### Step 4: Remove Deprecated Files
- [ ] Delete old nonceStore
- [ ] Delete old rateLimit
- [ ] Verify no imports remain

### Step 5: Type Organization
- [ ] Create event.types.ts
- [ ] Create task.types.ts
- [ ] Create reward.types.ts
- [ ] Move types from large files

---

## ✅ Success Criteria

After cleanup:
- ✅ No files over 500 lines
- ✅ No deprecated files
- ✅ Single task component directory
- ✅ Clear separation of concerns
- ✅ All endpoints use Redis
- ✅ Types organized by domain
- ✅ No duplicate code

---

## 🚀 Ready to Start?

Run this sequentially to avoid breaking changes.
