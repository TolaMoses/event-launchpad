# Fix Remaining Duplicate Policies

## Overview
This migration removes the final duplicate policies that were missed in the initial optimization pass. These duplicates were created by various migrations over time (upsert policies, admin system, etc.).

## Issues Fixed

### 1. **User Roles Table**
- **Problem**: 2 SELECT policies for authenticated role
  - `Admins can view all roles`
  - `Users can view own roles`
- **Solution**: Combined into single policy `Users can view roles`
- **Logic**: Users see their own roles OR admins see all roles

### 2. **Tasks Table**
- **Problem**: 2 SELECT policies for authenticated role
  - `Event creators can manage tasks`
  - `Public can view tasks of approved and active events`
- **Solution**: 
  - Combined SELECT into single policy `Users can view tasks`
  - Split "manage" into separate INSERT/UPDATE/DELETE policies
- **Logic**: Creators see their tasks OR public sees approved/active tasks

### 3. **Social Connections Table**
- **Problem**: Multiple duplicate policies
  - 2 SELECT policies: `Users can view their own connections`, `users read own connections`
  - 2 INSERT policies: `Users can insert their own connections`, `users upsert own connections (insert)`
  - Duplicate UPDATE: `users upsert own connections (update)`
- **Solution**: Removed all duplicates, kept one optimized policy per action
- **Note**: The "upsert" policies were likely created by an ORM or manual migration

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy contents of `fix_remaining_duplicate_policies.sql`
3. Paste and click **Run**

### Option 2: Supabase CLI
```bash
cd event-launchpad
supabase db push
```

### Option 3: Direct SQL
```bash
psql -h your-db-host -U postgres -d postgres -f migrations/fix_remaining_duplicate_policies.sql
```

## Migration Order

If you're running all optimizations, apply in this order:
1. `optimize_rls_policies.sql` (main optimization)
2. `fix_remaining_duplicate_policies.sql` (this file - cleanup)

## Changes Summary

### User Roles Table
- ✅ Combined 2 SELECT policies → 1 policy
- ✅ Optimized with `(SELECT auth.uid())`

### Tasks Table
- ✅ Combined 2 SELECT policies → 1 policy
- ✅ Split "manage" policy into INSERT/UPDATE/DELETE
- ✅ Optimized with `(SELECT auth.uid())`

### Social Connections Table
- ✅ Removed duplicate SELECT policy `users read own connections`
- ✅ Removed duplicate INSERT policy `users upsert own connections (insert)`
- ✅ Removed duplicate UPDATE policy `users upsert own connections (update)`
- ✅ All remaining policies optimized with `(SELECT auth.uid())`

## Verification

After running the migration, verify no duplicates remain:

```sql
-- Check for duplicate policies (should return 0 rows)
SELECT tablename, cmd, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_roles', 'tasks', 'social_connections')
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;

-- View all policies for these tables
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_roles', 'tasks', 'social_connections')
ORDER BY tablename, cmd, policyname;
```

Expected result: **0 duplicate policies**

## Safety

- ✅ **Safe to run** on production
- ✅ **Idempotent** (safe to run multiple times)
- ✅ **No data changes** (only policy modifications)
- ✅ **Security preserved** (all access rules maintained)
- ✅ **Uses DO blocks** to avoid errors if policies already exist

## Rollback

If needed, you can recreate the original policies from the respective migration files:
- `comprehensive_rls_policies.sql`
- `add_admin_system_and_approval.sql`

## Notes

- The "upsert" policies (`users upsert own connections`) were likely created by application code or a previous manual migration
- This migration uses `DO $$ ... END $$` blocks to conditionally create policies only if they don't exist
- All policies now use `(SELECT auth.uid())` for optimal performance
