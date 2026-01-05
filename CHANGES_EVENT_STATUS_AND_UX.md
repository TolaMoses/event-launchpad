# Event Status Flow & UX Improvements

## Summary of Changes

This document outlines the changes made to improve the event creation flow and UX.

---

## 1. Event Status Flow Updates

### Quick Events
**Flow**: `draft` → `review` → `approved` → `active` → `ended`

- ✅ Created in event creation form with full details (tasks + rewards)
- ✅ Automatically set to `review` status upon creation
- ✅ Requires admin approval before becoming `approved`
- ✅ Can be activated when start time arrives

### Community Events
**Flow**: `draft` → `review` → `approved` → `active` → `ended`

- ✅ Initially created with basic details only (status: `draft`)
- ✅ Tasks and rewards added later in dashboard
- ✅ When setup is complete, status changes to `review`
- ✅ Requires admin approval before becoming `approved`
- ✅ Can be activated when start time arrives

### Implementation Details

**File**: `src/routes/api/events/+server.ts`
- Line 73: Quick events → `review`, Community events → `draft`

**New API Endpoints Created**:
1. `POST /api/events/[id]/tasks` - Add tasks to community event
2. `POST /api/events/[id]/rewards` - Add rewards to community event
3. `POST /api/events/[id]/complete-setup` - Submit community event for review (changes status from `draft` to `review`)

---

## 2. UX Improvements

### A. Add Task Button Enhancement

**Problem**: Not obvious that users need to click "Add Task" after selecting a task type

**Solution**: 
- Button now has animated gradient background when task type is selected
- Pulsing glow effect draws attention
- Animation stops when task builder is open

**Implementation**:
- Added `class:highlight-action={selectedTaskType && !creatingTaskType}` to button
- CSS animation with gradient background and pulse effect

### B. Add Reward Button Enhancement

**Problem**: Not obvious that users need to click "Add Reward" after selecting a reward type

**Solution**:
- Button now has animated gradient background when reward type is selected
- Pulsing glow effect draws attention
- Same visual treatment as Add Task button

**Implementation**:
- Added `class:highlight-action={selectedRewardType}` to button
- Shares same CSS animation as task button

### C. Reward Configuration Simplification

**Problem**: Extra "Configure" step required after adding reward - not intuitive

**Solution**:
- Removed "Configure" button entirely
- Reward configuration form now shows immediately after adding reward
- Only "Remove" button remains in reward card header

**Changes**:
- Removed `editReward()` function
- Removed `editingRewardId` state variable
- Removed conditional rendering of reward config
- Reward config now always visible for each reward

**Before**:
```
Add Reward → Click "Configure" → Fill in details
```

**After**:
```
Add Reward → Fill in details immediately
```

---

## 3. Homepage Event Filtering

**Updated Logic**:
- **Active Events**: `status === 'approved'` AND `start_time <= now` AND `end_time > now`
- **Upcoming Events**: `status === 'approved'` AND `start_time > now`
- **Ended Events**: `status === 'approved'` AND `end_time <= now`

**Note**: Only `approved` events are shown on homepage. Events in `draft` or `review` status are only visible to creators in their dashboard.

---

## 4. CSS Additions

### Highlight Action Animation

```css
.highlight-action {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
  color: white !important;
  animation: pulse-glow 2s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 30px rgba(99, 102, 241, 0.6);
    transform: scale(1.02);
  }
}
```

---

## 5. Files Modified

### Frontend
- ✅ `src/routes/projects/create-event/+page.svelte`
  - Added highlight animation to Add Task button
  - Added highlight animation to Add Reward button
  - Removed Configure button and editReward logic
  - Reward config now always visible

- ✅ `src/routes/+page.svelte`
  - Updated event filtering logic for active/upcoming/ended

### Backend (New Files)
- ✅ `src/routes/api/events/[id]/tasks/+server.ts`
- ✅ `src/routes/api/events/[id]/rewards/+server.ts`
- ✅ `src/routes/api/events/[id]/complete-setup/+server.ts`

---

## 6. Testing Checklist

### Quick Events
- [ ] Create quick event with tasks and rewards
- [ ] Verify status is `review` after creation
- [ ] Verify event appears in dashboard (not homepage)
- [ ] Admin approves event → status becomes `approved`
- [ ] Event appears on homepage when approved

### Community Events
- [ ] Create community event with basic details only
- [ ] Verify status is `draft` after creation
- [ ] Add tasks via dashboard → verify setup_progress.tasks = 100
- [ ] Add rewards via dashboard → verify setup_progress.rewards = 100
- [ ] Complete setup → verify status changes to `review`
- [ ] Admin approves event → status becomes `approved`
- [ ] Event appears on homepage when approved

### UX
- [ ] Select task type → verify Add Task button glows/pulses
- [ ] Click Add Task → verify animation stops
- [ ] Select reward type → verify Add Reward button glows/pulses
- [ ] Click Add Reward → verify reward config shows immediately
- [ ] Verify no Configure button exists
- [ ] Verify can edit reward details inline

---

## 7. Database Considerations

### RLS Policies
The existing RLS policies already support this flow:
- Users can create events (INSERT)
- Users can view their own draft/review events
- Public can only view approved/active events
- Admins can view and update all events

### Status Values
Ensure database enum includes all status values:
- `draft`
- `review`
- `approved`
- `active`
- `ended`
- `cancelled` (optional)
- `rejected` (optional)

---

## 8. Future Enhancements

### Potential Improvements
1. **Progress Indicator**: Show visual progress for community event setup
2. **Auto-save**: Save draft progress as user fills form
3. **Validation Messages**: Show inline validation for required fields
4. **Preview Mode**: Allow creators to preview event before submission
5. **Notification System**: Notify creators when event is approved/rejected

---

## Notes

- TypeScript errors in new API files (`Cannot find module './$types'`) will resolve when dev server runs - SvelteKit generates these types automatically
- All changes are backward compatible with existing events
- No database migrations required (status values already exist)
