# Database RLS Policy Optimization

## Overview
This migration fixes Supabase performance warnings related to Row Level Security (RLS) policies.

## Issues Fixed

### 1. **Performance Optimization**
- **Problem**: `auth.uid()` was being re-evaluated for each row
- **Solution**: Replaced with `(SELECT auth.uid())` which evaluates once per query
- **Impact**: Significant performance improvement at scale

### 2. **Duplicate Policies**
- **Problem**: Multiple permissive policies for the same role and action
- **Solution**: Combined policies into single permissive policies
- **Tables affected**: `users`, `events`, `event_participants`, `task_submissions`

### 3. **Duplicate Indexes**
- **Problem**: `users` table had identical indexes `users_wallet_address_key` and `users_wallet_unique`
- **Solution**: Dropped `users_wallet_unique`, kept `users_wallet_address_key`

## How to Apply

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `optimize_rls_policies.sql`
5. Click **Run** to execute

### Option 2: Via Supabase CLI
```bash
# Make sure you're in the project directory
cd event-launchpad

# Run the migration
supabase db push
```

### Option 3: Manual SQL Execution
```bash
psql -h your-db-host -U postgres -d postgres -f migrations/optimize_rls_policies.sql
```

## Changes Summary

### Users Table
- ✅ Combined duplicate SELECT policies into one
- ✅ Optimized `auth.uid()` calls with `(SELECT auth.uid())`
- ✅ Removed duplicate index `users_wallet_unique`

### Social Connections Table
- ✅ Optimized all policies with `(SELECT auth.uid())`
- ✅ Removed duplicate UPDATE policy `users upsert own connections (update)`

### Events Table
- ✅ Combined 3 SELECT policies into 1 (own events + approved/active + admin view)
- ✅ Combined 2 UPDATE policies into 1 (user update own + admin update any)
- ✅ Optimized all `auth.uid()` calls with `(SELECT auth.uid())`

### Tasks Table
- ✅ Removed duplicate SELECT policies
- ✅ Combined into single policy for approved/active events
- ✅ Optimized creator check with `(SELECT auth.uid())`

### Event Participants Table
- ✅ Combined 2 duplicate INSERT policies into 1
- ✅ Combined view policies (own participations + creator view)
- ✅ Optimized all `auth.uid()` calls with `(SELECT auth.uid())`

### Task Submissions Table
- ✅ Combined 2 duplicate INSERT policies into 1
- ✅ Combined 2 duplicate UPDATE policies into 1
- ✅ Combined 2 duplicate SELECT policies into 1
- ✅ Optimized all `auth.uid()` calls with `(SELECT auth.uid())`

### Event Winners Table
- ✅ Combined 2 duplicate SELECT policies into 1
- ✅ Split "manage" policy into separate INSERT/UPDATE/DELETE
- ✅ Optimized creator check with `(SELECT auth.uid())`

### Task Verification Logs Table
- ✅ Optimized creator check with `(SELECT auth.uid())`

### User Roles Table (Admin System)
- ✅ Optimized all policies with `(SELECT auth.uid())`
- ✅ Fixed duplicate policy names

### Event Reviews Table (Admin System)
- ✅ Combined 2 duplicate SELECT policies into 1
- ✅ Optimized all `auth.uid()` calls with `(SELECT auth.uid())`

## Verification

After running the migration, verify the changes:

```sql
-- Check that policies are applied
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check indexes on users table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users';
```

## Expected Results

- ⚡ **Performance**: Queries should be faster, especially with large datasets
- ✅ **No warnings**: Supabase dashboard should no longer show RLS performance warnings
- 🔒 **Security**: All security rules remain intact, just optimized

## Rollback

If you need to rollback, you can restore the original policies from `comprehensive_rls_policies.sql`:

```bash
psql -h your-db-host -U postgres -d postgres -f migrations/comprehensive_rls_policies.sql
```

## Notes

- This migration is **safe to run** on production databases
- It does **not** modify any data, only policies and indexes
- All existing security rules are preserved
- The migration is **idempotent** (safe to run multiple times)
