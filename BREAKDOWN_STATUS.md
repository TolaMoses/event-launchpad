# 🔨 File Breakdown Status

## ✅ COMPLETED (Phase 1)

### 1. Types Extracted ✅
**File**: `src/lib/shared/types/event-creation.types.ts`

All type definitions extracted:
- `NftInput`
- `PositionReward`
- `MintableNft`
- `NftDistributionPosition`
- `RewardConfig`
- `UploadKind`
- `UploadedAsset`
- `EventType`
- `Task`
- `PrizeOption`
- `ChainOption`

### 2. Configuration Extracted ✅
**File**: `src/lib/config/event-creation.config.ts`

Constants and functions:
- `MAX_BANNER_SIZE`
- `MAX_LOGO_SIZE`
- `QUICK_EVENT_PRIZE_OPTIONS`
- `COMMUNITY_EVENT_PRIZE_OPTIONS`
- `getTaskOptions()`
- `getChainOptions()`
- `EVENT_TYPE_LABELS`

### 3. Utilities Extracted ✅
**File**: `src/lib/utils/event-creation.utils.ts`

Helper functions:
- `clone()` - Deep clone objects
- `generateId()` - Generate UUIDs
- `getTaskLabel()` - Get task type labels
- `summariseTask()` - Create task summaries
- `validateFileSize()` - Validate uploads
- `validateImageType()` - Validate image types
- `createPreviewUrl()` - Create blob URLs
- `validateDateTime()` - Validate dates
- `validateSchedule()` - Validate event schedule
- `formatDateForInput()` - Format dates for inputs
- `formatTimeForInput()` - Format times for inputs

### 4. Components Created ✅
**Directory**: `src/lib/components/event-creation/`

- ✅ `EventTypeSelector.svelte` (~140 lines) - Event type selection
- ✅ `EventBasicInfoForm.svelte` (~180 lines) - Title, description, video
- ✅ `EventScheduleForm.svelte` (~220 lines) - Start/end dates

---

## 📋 REMAINING COMPONENTS TO CREATE

### 5. More Components Needed (You'll need to create these)

Based on the original 2,819-line file, here are the remaining components:

#### `AssetUploader.svelte` (~200 lines)
**Purpose**: Upload banner and logo
**Props**:
```typescript
export let kind: 'banner' | 'logo';
export let file: File | null;
export let preview: string;
export let error: string;
export let maxSize: number;
export let onFileSelect: (file: File) => void;
```

#### `TaskBuilder.svelte` (~400 lines)
**Purpose**: Add/edit tasks
**Props**:
```typescript
export let selectedTaskType: TaskTypeKey | '';
export let creatingTaskType: TaskTypeKey | null;
export let editingTaskIndex: number | null;
export let onTaskSave: (task: TaskInstance) => void;
export let onTaskCancel: () => void;
```

#### `TaskList.svelte` (~150 lines)
**Purpose**: Display and manage task list
**Props**:
```typescript
export let tasks: TaskInstance[];
export let onEdit: (index: number) => void;
export let onDelete: (index: number) => void;
export let onReorder: (fromIndex: number, toIndex: number) => void;
```

#### `RewardConfigSection.svelte` (~300 lines)
**Purpose**: Configure rewards
**Props**:
```typescript
export let eventType: EventType;
export let rewards: RewardConfig[];
export let onRewardAdd: () => void;
export let onRewardEdit: (index: number) => void;
export let onRewardDelete: (index: number) => void;
```

#### `EventPreview.svelte` (~200 lines)
**Purpose**: Preview before submission
**Props**:
```typescript
export let title: string;
export let description: string;
export let startISO: string;
export let endISO: string;
export let tasks: TaskInstance[];
export let rewards: RewardConfig[];
export let bannerPreview: string;
export let logoPreview: string;
```

#### `SubmitEventButton.svelte` (~100 lines)
**Purpose**: Submission handling
**Props**:
```typescript
export let isValid: boolean;
export let isSubmitting: boolean;
export let onSubmit: () => Promise<void>;
```

---

## 🎯 HOW TO COMPLETE THE BREAKDOWN

### Option 1: Extract Manually (Recommended)

1. **Open the original file**:
   ```
   src/routes/projects/create-event/+page.svelte
   ```

2. **Find each section** (search for comments like "Banner upload", "Task builder", etc.)

3. **Copy the relevant HTML/logic** for each section

4. **Create the component file** in `src/lib/components/event-creation/`

5. **Extract props and events**

6. **Test the component** in isolation

7. **Replace in main page** with component

### Option 2: AI-Assisted (Faster)

For each remaining component, tell me:
> "Extract [ComponentName] from create-event page"

I'll:
1. Read the relevant section
2. Extract the code
3. Create the component file
4. Show you how to integrate it

---

## 📝 INTEGRATION GUIDE

### How to Use Extracted Code in Main Page

**Before** (2,819 lines):
```svelte
<script>
  // 100+ lines of types
  // 50+ lines of config
  // 100+ lines of functions
  // 2,500+ lines of HTML/logic
</script>
```

**After** (~400 lines):
```svelte
<script>
  import { clone, generateId } from '$lib/utils/event-creation.utils';
  import { QUICK_EVENT_PRIZE_OPTIONS } from '$lib/config/event-creation.config';
  import EventTypeSelector from '$lib/components/event-creation/EventTypeSelector.svelte';
  import EventBasicInfoForm from '$lib/components/event-creation/EventBasicInfoForm.svelte';
  import EventScheduleForm from '$lib/components/event-creation/EventScheduleForm.svelte';
  // ... other components
  
  let eventType = '';
  let title = '';
  let description = '';
  // ... state variables

  function handleTypeSelect(type) {
    eventType = type;
  }
</script>

<!-- Usage -->
<EventTypeSelector 
  selectedType={eventType}
  onSelect={handleTypeSelect}
/>

{#if eventType}
  <EventBasicInfoForm
    bind:title
    bind:description
    bind:videoUrl
    bind:numWinners
    showWinners={eventType === 'quick_event'}
  />

  <EventScheduleForm
    bind:startDate
    bind:startTime
    bind:endDate
    bind:endTime
    bind:startISO
    bind:endISO
    bind:error={scheduleError}
  />

  <!-- More components... -->
{/if}
```

---

## 🎨 BENEFITS SO FAR

### Code Organization
- ✅ **Types**: All in one place, reusable
- ✅ **Config**: Easy to modify, centralized
- ✅ **Utils**: Testable, reusable functions
- ✅ **Components**: ~150 lines each (manageable)

### Maintainability
- ✅ Each component has **single responsibility**
- ✅ **Easy to test** individual components
- ✅ **Easy to find** relevant code
- ✅ **Easy to modify** without breaking others

### Reusability
- ✅ `EventBasicInfoForm` - Use in edit page
- ✅ `EventScheduleForm` - Use anywhere dates needed
- ✅ `AssetUploader` - Use for any image uploads
- ✅ Utilities - Use across entire app

---

## 🚀 NEXT STEPS

### Immediate
1. **Review extracted files** to ensure they match your needs
2. **Decide**: Manual extraction or AI-assisted?
3. **Create remaining components** (6 more needed)

### Once Components Done
1. **Update main page** to use components
2. **Test each component** individually
3. **Test integrated page**
4. **Delete old code** from main page

### Final Result
- **Main page**: ~400 lines (orchestration)
- **Components**: ~150 lines each
- **Types/Utils**: Reusable across app
- **Total lines**: Same, but **organized**!

---

## 💡 TIPS

### Component Creation Pattern
```svelte
<!-- ComponentName.svelte -->
<script lang="ts">
  // 1. Imports
  import { someUtil } from '$lib/utils/...';
  
  // 2. Props (inputs)
  export let propName: string = '';
  
  // 3. Events (outputs)
  export let onAction: () => void = () => {};
  
  // 4. Local state
  let localState = '';
  
  // 5. Reactive statements
  $: derivedValue = propName + localState;
  
  // 6. Functions
  function handleSomething() {
    onAction();
  }
</script>

<!-- 7. Template -->
<div class="component-name">
  <!-- HTML here -->
</div>

<!-- 8. Styles (scoped) -->
<style>
  .component-name {
    /* Styles here */
  }
</style>
```

### Testing Strategy
1. **Test in isolation** - Create test page
2. **Mock props** - Use dummy data
3. **Test events** - Log to console
4. **Visual check** - Does it look right?
5. **Integration test** - Use in real page

---

## 📞 NEED HELP?

**Stuck on a component?** Tell me which one and I'll help extract it.

**Want me to do it all?** Say "extract all remaining components" and I'll create them one by one.

**Want to do it yourself?** Follow the pattern above and you'll be fine!

---

## ✅ PROGRESS TRACKER

- [x] Extract types
- [x] Extract config
- [x] Extract utils
- [x] Create EventTypeSelector
- [x] Create EventBasicInfoForm
- [x] Create EventScheduleForm
- [ ] Create AssetUploader
- [ ] Create TaskBuilder
- [ ] Create TaskList
- [ ] Create RewardConfigSection
- [ ] Create EventPreview
- [ ] Create SubmitEventButton
- [ ] Update main page
- [ ] Test everything
- [ ] Delete old code

**Progress**: 6/15 tasks complete (40%)

---

**Ready to continue?** Let me know which component to create next!
