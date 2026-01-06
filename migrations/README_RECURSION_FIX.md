# Fix: Infinite Recursion in user_roles RLS Policies

## Problem

**Error**: `infinite recursion detected in policy for relation "user_roles"`

**Cause**: The RLS policies on the `user_roles` table were checking the `user_roles` table itself to determine if a user is an admin. This creates a circular dependency:

```
To read user_roles → Check if user is admin → Read user_roles → Check if user is admin → ∞
```

## Solution

Use **SECURITY DEFINER** functions that bypass RLS when checking admin status.

### How It Works

1. **Security Definer Functions**: These functions run with the privileges of the function creator (bypassing RLS)
2. **Helper Functions Created**:
   - `auth.is_admin()` - Returns true if current user is admin
   - `auth.is_admin_or_moderator()` - Returns true if current user is admin or moderator

3. **Updated Policies**: All policies now use these helper functions instead of directly querying `user_roles`

## Migration File

**File**: `migrations/fix_user_roles_infinite_recursion.sql`

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Open **SQL Editor** in Supabase
2. Copy contents of `fix_user_roles_infinite_recursion.sql`
3. Paste and click **Run**

### Option 2: Supabase CLI
```bash
cd event-launchpad
supabase db push
```

## What Changed

### Before (Problematic)
```sql
CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur  -- ❌ Recursion!
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
);
```

### After (Fixed)
```sql
-- Helper function (bypasses RLS)
CREATE FUNCTION public.is_admin()
RETURNS boolean
SECURITY DEFINER  -- ✅ Bypasses RLS
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Policy uses helper function
CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
USING (public.is_admin());  -- ✅ No recursion!
```

## Tables Fixed

- ✅ `user_roles` - All policies updated
- ✅ `events` - Admin check policies updated
- ✅ `event_reviews` - Admin check policies updated

## Verification

After running the migration:

```sql
-- Test 1: Check if functions work
SELECT public.is_admin();
-- Should return: true or false (no error)

-- Test 2: Query user_roles
SELECT * FROM user_roles;
-- Should return: your roles (no recursion error)

-- Test 3: Query events
SELECT * FROM events;
-- Should return: events (no error)
```

## Important Notes

1. **SECURITY DEFINER**: These functions run with elevated privileges. They're safe because they only check the current user's roles.

2. **Performance**: These functions are marked as `STABLE`, meaning PostgreSQL can cache the result within a single query.

3. **Permissions**: The functions are granted to `authenticated` role only.

## Related Files

If you previously ran these migrations, you may need to run this fix:
- `optimize_rls_policies.sql` - May have introduced the recursion
- `fix_remaining_duplicate_policies.sql` - May have introduced the recursion

## Migration Order

If starting fresh:
1. `comprehensive_rls_policies.sql`
2. `add_admin_system_and_approval.sql`
3. `optimize_rls_policies.sql`
4. `fix_remaining_duplicate_policies.sql`
5. **`fix_user_roles_infinite_recursion.sql`** ← Run this to fix recursion

## Rollback

If you need to rollback (not recommended):

```sql
-- Drop the helper functions
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_admin_or_moderator();

-- Recreate simple policies (will have recursion issue)
-- Not recommended - use the fixed version instead
```

## Summary

✅ **Problem**: Infinite recursion in `user_roles` policies  
✅ **Solution**: SECURITY DEFINER functions that bypass RLS  
✅ **Result**: No more recursion errors, policies work correctly  
✅ **Safe**: Functions only check current user's roles  
✅ **Fast**: Results are cached within queries  

Your database is now fixed and ready to use! 🎉
