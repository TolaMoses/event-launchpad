-- ============================================
-- FIX REMAINING DUPLICATE POLICIES
-- ============================================
-- This migration removes the last remaining duplicate policies
-- that were created by various migrations over time

-- ============================================
-- USER ROLES TABLE - Remove duplicate SELECT policies
-- ============================================

-- Drop all existing SELECT policies
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

-- Create single combined SELECT policy
CREATE POLICY "Users can view roles"
ON user_roles FOR SELECT
TO authenticated
USING (
    -- Users can view their own roles
    (SELECT auth.uid()) = user_id
    OR 
    -- Admins can view all roles
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'admin'
    )
);

-- ============================================
-- TASKS TABLE - Remove duplicate SELECT policies
-- ============================================

-- Drop all existing SELECT policies
DROP POLICY IF EXISTS "Event creators can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Public can view tasks of approved and active events" ON tasks;
DROP POLICY IF EXISTS "Public can view tasks of active events" ON tasks;

-- Create single combined SELECT policy
CREATE POLICY "Users can view tasks"
ON tasks FOR SELECT
TO anon, authenticated
USING (
    -- Event creators can view their tasks
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = tasks.event_id
        AND events.created_by = (SELECT auth.uid())
    )
    OR
    -- Public can view tasks of approved/active events
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = tasks.event_id
        AND events.status IN ('approved', 'active')
    )
);

-- Keep the other task policies for INSERT/UPDATE/DELETE
-- (Event creators can manage tasks)
CREATE POLICY "Event creators can manage tasks"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = tasks.event_id
        AND events.created_by = (SELECT auth.uid())
    )
);

CREATE POLICY "Event creators can update tasks"
ON tasks FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = tasks.event_id
        AND events.created_by = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = tasks.event_id
        AND events.created_by = (SELECT auth.uid())
    )
);

CREATE POLICY "Event creators can delete tasks"
ON tasks FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = tasks.event_id
        AND events.created_by = (SELECT auth.uid())
    )
);

-- ============================================
-- SOCIAL CONNECTIONS TABLE - Remove duplicate policies
-- ============================================

-- Drop all existing SELECT policies
DROP POLICY IF EXISTS "Users can view their own connections" ON social_connections;
DROP POLICY IF EXISTS "users read own connections" ON social_connections;

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "Users can insert their own connections" ON social_connections;
DROP POLICY IF EXISTS "users upsert own connections (insert)" ON social_connections;

-- Drop duplicate UPDATE policy (if not already dropped)
DROP POLICY IF EXISTS "users upsert own connections (update)" ON social_connections;

-- Create single SELECT policy
CREATE POLICY "Users can view their own connections"
ON social_connections FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Create single INSERT policy
CREATE POLICY "Users can insert their own connections"
ON social_connections FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Keep the UPDATE policy (already optimized in previous migration)
-- If it doesn't exist, create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'social_connections' 
        AND policyname = 'Users can update their own connections'
    ) THEN
        CREATE POLICY "Users can update their own connections"
        ON social_connections FOR UPDATE
        TO authenticated
        USING ((SELECT auth.uid()) = user_id)
        WITH CHECK ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

-- Keep the DELETE policy (if it exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'social_connections' 
        AND policyname = 'Users can delete their own connections'
    ) THEN
        CREATE POLICY "Users can delete their own connections"
        ON social_connections FOR DELETE
        TO authenticated
        USING ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this after the migration to verify no duplicate policies remain:
-- 
-- SELECT tablename, cmd, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY tablename, cmd
-- HAVING COUNT(*) > 1
-- ORDER BY tablename, cmd;
