# Fix RLS Infinite Recursion Error

## Problem
You're seeing this error:
```
infinite recursion detected in policy for relation "user_roles"
```

This happens because the RLS policies on the `user_roles` table reference the `user_roles` table itself, creating a circular dependency.

## Solution

### Step 1: Apply the Migration

Go to your Supabase dashboard:
1. Navigate to **SQL Editor**
2. Open the file `migrations/fix_user_roles_rls_recursion.sql`
3. Copy all the SQL code
4. Paste it into the SQL Editor
5. Click **Run**

### Step 2: Verify the Fix

After running the migration, test by:
1. Refreshing your homepage - events should now load
2. Checking the browser console - no more RLS errors

## What Changed?

### Before (Problematic):
```sql
-- This causes infinite recursion
CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur  -- ❌ Querying user_roles inside user_roles policy
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
);
```

### After (Fixed):
```sql
-- Simple policy without recursion
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
USING (user_id = auth.uid());  -- ✅ No circular reference

-- Admin operations use service role (supabaseAdmin)
CREATE POLICY "Service role can manage all roles"
ON user_roles FOR ALL
TO service_role
USING (true);

-- Helper function with SECURITY DEFINER bypasses RLS
CREATE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = user_uuid
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- ✅ Bypasses RLS
```

## How It Works Now

1. **Users can view their own roles** - Simple policy, no recursion
2. **Admin operations** - Done through API endpoints using `supabaseAdmin` (service role)
3. **Other policies** - Use `is_admin()` and `is_admin_or_moderator()` functions which bypass RLS

## API Endpoints Already Using Service Role

These endpoints already use `supabaseAdmin` so they'll work correctly:
- `/api/admin/approve-event` - Approve/reject events
- `/api/admin/add-moderator` - Add moderators
- `/api/admin/remove-moderator` - Remove moderators
- `/api/admin/event-details` - View event details

## Testing

After applying the migration:

### Test 1: Homepage Loads
```
✅ Visit homepage
✅ Events display (no 500 error)
✅ No console errors
```

### Test 2: Admin Dashboard
```
✅ Visit /admin
✅ Pending events load
✅ Can view event details
✅ Can approve/reject events
```

### Test 3: User Roles
```
✅ Users can see their own roles in profile
✅ Admins can grant/revoke roles via API
```

## If You Still See Errors

1. **Clear browser cache** - Old queries might be cached
2. **Check Supabase logs** - Go to Logs > Postgres Logs in dashboard
3. **Verify migration ran** - Check if policies exist:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'user_roles';
   ```

## Alternative: Manual Fix via Supabase Dashboard

If you prefer to fix manually:

1. Go to **Database** > **user_roles** table
2. Click **RLS** tab
3. Delete all existing policies
4. Add two new policies:
   - **Name:** "Users can view own roles"
     - **Policy command:** SELECT
     - **Target roles:** authenticated
     - **USING expression:** `user_id = auth.uid()`
   
   - **Name:** "Service role can manage all roles"
     - **Policy command:** ALL
     - **Target roles:** service_role
     - **USING expression:** `true`
     - **WITH CHECK expression:** `true`

5. Save and test

## Why This Happened

The original migration (`add_admin_system_and_approval.sql`) created policies that checked if a user was an admin by querying the `user_roles` table. When Postgres tried to enforce RLS on that query, it needed to check the policy again, which queried `user_roles` again, creating infinite recursion.

The fix separates concerns:
- Regular users: Simple policies
- Admin operations: Service role (bypasses RLS)
- Policy checks: SECURITY DEFINER functions (bypass RLS)
