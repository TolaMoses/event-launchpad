# Cleanup: Community Event References Removed

## Summary

Removed all references to "community" event type from the codebase. The platform now has a single event type: `quick_event`.

---

## Changes Made

### 1. ✅ Event Participation Logic Fixed

**File**: `src/routes/events/[id]/+page.svelte`

#### **Before**
- Users were auto-joined when viewing an event
- Added to `event_participants` table immediately

#### **After**
- Users are added to `event_participants` **only when they complete their first task**
- Viewing an event no longer auto-joins

```javascript
// Add user to event participants if this is their first task completion
if (!hasJoined) {
  const { error: participantError } = await supabase
    .from('event_participants')
    .insert({
      event_id: event.id,
      user_id: userId
    });

  if (!participantError) {
    hasJoined = true;
  }
}
```

---

### 2. ✅ API Endpoint Cleaned

**File**: `src/routes/api/events/+server.ts`

#### **Removed**
- Community event type validation
- Setup progress calculation for community events
- Conditional status logic (draft vs review)

#### **Updated**
```javascript
// Before
if (eventType !== 'quick_event' && eventType !== 'community') {
  throw error(400, 'event_type must be either "quick_event" or "community"');
}

// After
if (eventType !== 'quick_event') {
  throw error(400, 'event_type must be "quick_event"');
}
```

```javascript
// Before
const initialStatus = eventType === 'quick_event' ? 'review' : 'draft';

// After
const initialStatus = 'review';
```

```javascript
// Before
setup_progress: setupProgress,

// After
setup_progress: null, // No longer needed - all events are complete on creation
```

---

### 3. ✅ Dashboard Simplified

**File**: `src/routes/dashboard/+page.svelte`

#### **Removed**
- Community event type badge
- Setup progress section
- "Continue Setup" button logic
- Conditional rendering based on event type

#### **Updated**
```typescript
// Before
event_type: 'quick_event' | 'community';

// After
event_type: 'quick_event';
```

```javascript
// Before
function getSetupProgress(event: Event): number {
  if (event.event_type !== 'community' || !event.setup_progress) return 100;
  const { tasks, rewards } = event.setup_progress;
  return Math.round((tasks + rewards) / 2);
}

// After
function getSetupProgress(event: Event): number {
  return 100; // All events are complete on creation
}
```

```svelte
<!-- Before -->
<span class="type-badge" class:community={event.event_type === 'community'}>
  {event.event_type === 'community' ? '🏘️ Community' : '⚡ Quick Event'}
</span>

<!-- After -->
<span class="type-badge">
  ⚡ Event
</span>
```

---

### 4. ✅ Homepage Cleaned

**File**: `src/routes/+page.svelte`

#### **Removed**
- `communityEvents` filter
- Community Events section
- Event type filtering logic

---

### 5. ✅ Create Event Form

**File**: `src/routes/projects/create-event/+page.svelte`

#### **Already Updated**
- Event type defaults to `quick_event`
- No type selection UI
- All validation references to community removed

---

## Files Modified

1. ✅ `src/routes/events/[id]/+page.svelte` - Fixed participation logic
2. ✅ `src/routes/api/events/+server.ts` - Removed community type support
3. ✅ `src/routes/dashboard/+page.svelte` - Removed community UI elements
4. ✅ `src/routes/+page.svelte` - Removed community events section
5. ✅ `src/routes/projects/create-event/+page.svelte` - Already cleaned

---

## Remaining References

### **Intentionally Kept**
These files still have "community" references but are either:
- Legacy/deprecated features
- Task-specific content (not event types)
- Configuration files

**Files**:
- `src/routes/api/events/[id]/complete-setup/+server.ts` - Legacy endpoint (can be deleted)
- `src/routes/api/events/[id]/tasks/+server.ts` - Legacy endpoint (can be deleted)
- `src/routes/api/events/[id]/rewards/+server.ts` - Legacy endpoint (can be deleted)
- `src/routes/projects/setup-event/[id]/+page.svelte` - Legacy page (can be deleted)
- `src/app.css` - CSS variable `--community-color` (used for styling)
- `src/lib/config/assets.ts` - Asset configuration
- Task components - Refer to "community" as social platforms, not event types

---

## Database Considerations

### **Schema**
- `event_type` column still exists in database
- Can store both `quick_event` and `community` values
- New events will always be `quick_event`
- Existing events unchanged

### **Migration Not Required**
- No schema changes needed
- Backward compatible with existing data
- Old community events still work

---

## Event Participation Flow

### **New Flow**
```
1. User views event
   ↓
2. User sees tasks (read-only if not logged in)
   ↓
3. User logs in (if needed)
   ↓
4. User completes first task
   ↓
5. User is added to event_participants ✅
   ↓
6. User continues completing tasks
```

### **Benefits**
- ✅ Only engaged users are counted as participants
- ✅ More accurate participation metrics
- ✅ No "ghost" participants who just viewed the event
- ✅ Cleaner analytics

---

## Testing Checklist

### **Event Creation**
- [ ] Create event → Defaults to `quick_event`
- [ ] Event requires tasks and rewards
- [ ] Event status is `review` after creation
- [ ] No setup progress shown

### **Event Participation**
- [ ] View event when not logged in → Tasks visible (read-only)
- [ ] View event when logged in → Tasks visible (interactive)
- [ ] Complete first task → Added to `event_participants`
- [ ] Complete second task → No duplicate participant entry
- [ ] Refresh page → Still shows as participant

### **Dashboard**
- [ ] Events show "⚡ Event" badge (not "Quick Event" or "Community")
- [ ] No setup progress section shown
- [ ] Event stats show correctly
- [ ] All events show as 100% complete

### **API**
- [ ] POST /api/events with `event_type: "quick_event"` → Success
- [ ] POST /api/events with `event_type: "community"` → Error
- [ ] All events created have `status: "review"`
- [ ] All events have `setup_progress: null`

---

## Summary

✅ **Removed all community event type references**  
✅ **Fixed participation logic** - users join on first task completion  
✅ **Simplified dashboard** - no setup progress UI  
✅ **Cleaned API** - single event type only  
✅ **Updated homepage** - removed community section  

The codebase is now cleaner and more maintainable! 🎉
