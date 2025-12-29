# Username Requirement & Event Display Updates

## Summary of Changes

### ✅ 1. Username Requirement System

**Server-Side Protection (`src/hooks.server.ts`)**
- Added middleware that checks if authenticated users have set a username
- Protected paths: `/projects`, `/dashboard`, `/admin`, `/events`
- Automatically redirects users without username to `/profile?required=username`
- Prevents access to key features until username is set

**Profile Page Enhancements (`src/routes/profile/+page.svelte`)**
- **Prominent notice** when username is not set, explaining why it's required:
  - Create and manage events
  - Participate in events and complete tasks
  - Receive rewards and track progress
  - Be identified in leaderboards and event listings
- **Visual highlighting** of username section with orange border when required
- **Auto-focus** on username input field when redirected
- **Real-time validation** with visual feedback (✓ available, ✗ taken, ⏳ checking)
- **Red error message** displayed below input when username is taken
- **Input field turns red** when username is unavailable

### ✅ 2. Admin Dashboard Improvements

**Username Display (`src/routes/admin/+page.svelte`)**
- Shows creator's **username** instead of wallet address
- Falls back to shortened wallet address if username not set
- Format: `username` or `0x1234...5678`

**Event Details Link**
- Fixed "View Details" button to navigate to `/events/{id}`
- Removed `target="_blank"` to keep navigation in same tab
- Allows admins to review full event details before approval

### ✅ 3. Event Status & Filtering

**Homepage (`src/routes/+page.svelte`)**
- **Only shows approved and active events** to public
- Query: `.in('status', ['approved', 'active'])`
- Events in review/draft/rejected are hidden from homepage

**Dashboard (`src/routes/dashboard/+page.svelte`)**
- **Shows ALL user events** regardless of status
- Added new status badges:
  - `review` → "In Review" (orange)
  - `approved` → "Approved" (green)
  - `rejected` → "Rejected" (red)
- Users can see their events even when pending approval

**Event Creation Flow**
- Quick events → status: `review` (requires admin approval)
- Community events → status: `draft` (no approval needed)

## User Flow

### New User Journey:
1. **User connects wallet** → Logs in
2. **Tries to access protected page** (e.g., `/projects/create-event`)
3. **Redirected to `/profile?required=username`**
4. **Sees prominent notice** explaining why username is needed
5. **Username input auto-focused** and scrolled into view
6. **Enters username** → Real-time validation
7. **If taken** → Red error message appears below input
8. **If available** → Green checkmark appears
9. **Saves profile** → Can now access all features

### Event Creator Journey:
1. **Creates quick event** → Status: `review`
2. **Event appears in dashboard** with "In Review" badge
3. **Event NOT visible on homepage** (pending approval)
4. **Admin reviews** → Approves or rejects
5. **If approved** → Status: `approved`, visible on homepage
6. **If rejected** → Status: `rejected`, reason shown to creator

### Admin Review Journey:
1. **Visits `/admin`** → Sees pending events
2. **Reviews event details**:
   - Creator username (not wallet)
   - Tasks count
   - Rewards count
   - Start/end dates
3. **Clicks "View Details"** → Opens full event page
4. **Approves** → Event becomes public
5. **Rejects** → Enters reason → Creator notified

## Database Requirements

**Make sure you've run these migrations:**
1. `migrations/add_admin_system_and_approval.sql` - Admin roles & event approval
2. `migrations/add_enhanced_rewards.sql` - Multi-reward system

**Grant yourself admin access:**
```sql
-- Find your user ID
SELECT id, raw_user_meta_data FROM auth.users;

-- Grant admin role
INSERT INTO user_roles (user_id, role, granted_by)
VALUES ('YOUR_USER_ID_HERE', 'admin', 'YOUR_USER_ID_HERE')
ON CONFLICT (user_id, role) DO NOTHING;
```

## Testing Checklist

### Username Requirement:
- [ ] New user without username is redirected to profile
- [ ] Username input is auto-focused
- [ ] Taken username shows red error
- [ ] Available username shows green checkmark
- [ ] Can't access protected pages without username
- [ ] After setting username, can access all features

### Event Display:
- [ ] Homepage only shows approved/active events
- [ ] Dashboard shows all user events (including review)
- [ ] "In Review" badge appears for pending events
- [ ] Admin page shows creator username
- [ ] "View Details" link works correctly

### Admin Workflow:
- [ ] Admin can see all pending events
- [ ] Can approve events (status → approved)
- [ ] Can reject events with reason
- [ ] Approved events appear on homepage
- [ ] Rejected events show reason to creator

## Notes

- **Username validation**: 3-20 characters, lowercase letters, numbers, underscores only
- **Protected paths**: `/projects`, `/dashboard`, `/admin`, `/events`
- **Public paths**: `/`, `/profile`, `/auth/*` (no username required)
- **Event statuses**: `draft`, `review`, `approved`, `rejected`, `active`, `ended`, `cancelled`
