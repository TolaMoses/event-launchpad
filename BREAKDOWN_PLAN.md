# 🔨 File Breakdown Plan

## Current Problems

| File | Lines | Size | Issue |
|------|-------|------|-------|
| `create-event/+page.svelte` | 2,819 | 81KB | Monolithic, unmaintainable |
| `events/[id]/+page.svelte` | 1,000+ | 34.5KB | Too large |

## Breakdown Strategy

### 1. Extract Types (create-event)
**Target**: `src/lib/shared/types/event-creation.types.ts`

Extract all type definitions:
- `NftInput`
- `PositionReward`
- `MintableNft`
- `NftDistributionPosition`
- `RewardConfig`
- `UploadedAsset`
- etc.

### 2. Extract Configuration
**Target**: `src/lib/config/event-creation.config.ts`

Extract constants:
- `quickEventPrizeOptions`
- `communityEventPrizeOptions`
- `taskOptions`
- `chainOptions`
- `MAX_BANNER_SIZE`
- `MAX_LOGO_SIZE`

### 3. Extract Utilities
**Target**: `src/lib/utils/event-creation.utils.ts`

Extract helper functions:
- `clone()`
- `generateId()`
- `getTaskLabel()`
- `summariseTask()`
- File upload helpers
- Validation helpers

### 4. Extract Components (create-event)

```
src/lib/components/event-creation/
├── EventTypeSelector.svelte       (~50 lines)
├── EventBasicInfoForm.svelte      (~150 lines)
├── EventScheduleForm.svelte       (~100 lines)
├── AssetUploader.svelte           (~200 lines)
├── TaskBuilder.svelte             (~400 lines)
├── TaskList.svelte                (~150 lines)
├── RewardConfigSection.svelte     (~300 lines)
├── EventPreview.svelte            (~200 lines)
└── SubmitEventButton.svelte       (~100 lines)
```

**Result**: Main page becomes ~400-500 lines (orchestration only)

### 5. Break Down Event Detail Page

```
src/lib/components/event-detail/
├── EventHeader.svelte             (~150 lines)
├── EventDescription.svelte        (~100 lines)
├── TasksSection.svelte            (~300 lines)
├── LeaderboardSection.svelte      (~200 lines)
├── ParticipantsSection.svelte     (~150 lines)
└── EventActions.svelte            (~100 lines)
```

**Result**: Main page becomes ~300-400 lines

---

## Implementation Order

1. **Extract types first** (no dependencies)
2. **Extract config** (depends on types)
3. **Extract utils** (depends on types)
4. **Extract small components** (bottom-up)
5. **Refactor main page** (uses extracted components)

---

## Files to Create (20 total)

### Types (1 file)
- `src/lib/shared/types/event-creation.types.ts`

### Config (1 file)
- `src/lib/config/event-creation.config.ts`

### Utils (1 file)
- `src/lib/utils/event-creation.utils.ts`

### Components (17 files)
- 9 for create-event
- 6 for event detail
- 2 shared (AssetUploader, etc.)

---

## Benefits

**Before**:
- 2,819 lines in one file
- Hard to test
- Hard to reuse
- Hard to maintain

**After**:
- ~150 lines per component
- Easy to test each component
- Reusable components
- Clear responsibilities
- Easier to maintain

---

## Ready to Start?

I'll create the files in order:
1. Types
2. Config
3. Utils
4. Components (one by one)
5. Update main page

Say "start" to begin!
