# Admin System Setup Guide

## Overview
This guide explains how to set up the admin/moderator system and event approval workflow for Event Launchpad.

## Features Implemented

### 1. **Admin & Moderator Roles**
- Admins can approve/reject events and manage moderators
- Moderators can approve/reject events
- Regular users can only create and participate in events

### 2. **Event Approval Workflow**
- **Quick Events**: `draft` → `review` → `approved`/`rejected` → `active`
- **Community Events**: `draft` → `active` (no approval needed)
- Only approved/active events show on the public homepage
- Creators can see their events in all statuses in their dashboard

### 3. **User Restrictions**
- Users **cannot join their own events**
- Users **cannot submit tasks for their own events**
- Tasks are visible immediately (no join gate)

## Database Setup

### Step 1: Run the Admin System Migration

Go to your Supabase SQL Editor and run `migrations/add_admin_system_and_approval.sql`:

```sql
-- This creates:
-- 1. user_roles table (admin/moderator permissions)
-- 2. event_reviews table (approval/rejection records)
-- 3. Updated RLS policies
-- 4. Helper functions
```

### Step 2: Grant Yourself Admin Access

**Find your user ID** from your JWT token or run:
```sql
SELECT id, raw_user_meta_data FROM auth.users LIMIT 10;
```

Look for your wallet address in the results.

**Grant admin role to yourself:**
```sql
INSERT INTO user_roles (user_id, role, granted_by)
VALUES ('YOUR_USER_ID_HERE', 'admin', 'YOUR_USER_ID_HERE')
ON CONFLICT (user_id, role) DO NOTHING;
```

Replace `YOUR_USER_ID_HERE` with your actual user ID (the UUID from the previous query).

### Step 3: Run Enhanced Rewards Migration

If you haven't already, run `migrations/add_enhanced_rewards.sql`:

```sql
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS reward_types jsonb DEFAULT '[]'::jsonb;

-- ... (rest of the migration)
```

## Using the Admin Dashboard

### Accessing Admin Dashboard

1. Navigate to `/admin` in your browser
2. If you're not an admin, you'll see "Access Denied"
3. If you are an admin, you'll see:
   - **Pending Event Reviews**: All events with status = 'review'
   - **Moderators & Admins**: List of all admin/moderator users

### Approving Events

1. Review the event details (title, description, tasks, rewards, dates)
2. Click **"✓ Approve"** to approve
   - Event status changes to `approved`
   - Event becomes visible on homepage
   - Creator can now activate it

3. Click **"✗ Reject"** to reject
   - Enter a reason for rejection
   - Event status changes to `rejected`
   - Creator will see the rejection reason

### Managing Moderators

1. Enter a wallet address or email in the "Add Moderator" field
2. Click "Add Moderator"
3. The user will be granted moderator permissions
4. To remove: Click "Remove" next to their name

**Note**: You cannot remove the last admin (yourself).

## Event Status Flow

### Quick Events
```
Create Event
    ↓
[draft] - User fills out form
    ↓
Submit Event
    ↓
[review] - Waiting for admin approval
    ↓
Admin Reviews
    ↓
[approved] ←→ [rejected]
    ↓
Creator Activates
    ↓
[active] - Event is live
    ↓
Event Ends
    ↓
[ended]
```

### Community Events
```
Create Event
    ↓
[draft] - User sets up tasks/rewards
    ↓
Creator Activates (no approval needed)
    ↓
[active] - Event is live
    ↓
Event Ends
    ↓
[ended]
```

## RLS Policy Changes

### Events Table
- **Public**: Can view events with status `approved` or `active`
- **Admins/Moderators**: Can view ALL events (including `review` status)
- **Creators**: Can view their own events in any status

### Event Participants
- Users can join `approved` or `active` events
- **Cannot join own events** (enforced by RLS)

### Task Submissions
- Users can submit tasks for `approved` or `active` events
- **Cannot submit to own events** (enforced by RLS)

## API Endpoints

### POST `/api/events`
- Creates a new event
- Quick events → status: `review`
- Community events → status: `draft`

### POST `/api/admin/approve-event`
- Requires admin or moderator role
- Body: `{ event_id, action: 'approve'|'reject', reason?: string }`
- Updates event status and creates review record

## Troubleshooting

### "Access Denied" on Admin Page
- Check if you ran the admin migration
- Verify you inserted your user_id into user_roles table
- Check your user_id matches the one in your JWT token

### Events Not Showing on Homepage
- Check event status (must be `approved` or `active`)
- Verify RLS policies are applied
- Check browser console for errors

### Cannot Join Event
- If it's your own event, this is expected behavior
- Check event status (must be `approved` or `active`)
- Verify you're logged in

## Next Steps

1. **Run all migrations** in Supabase SQL Editor
2. **Grant yourself admin access** using your user ID
3. **Test the workflow**:
   - Create a quick event
   - Check it appears in `/admin` with status `review`
   - Approve it
   - Verify it appears on homepage
4. **Add moderators** if needed

## Security Notes

- Only admins can grant/revoke moderator roles
- Only admins/moderators can approve/reject events
- RLS policies prevent users from joining/submitting to their own events
- All admin actions are logged in `event_reviews` table

## Support

If you encounter issues:
1. Check Supabase logs for RLS policy errors
2. Verify all migrations ran successfully
3. Confirm your user_id is correct in user_roles table
4. Check browser console for frontend errors
