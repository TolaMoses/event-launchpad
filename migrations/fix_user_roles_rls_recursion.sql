-- ============================================
-- FIX USER_ROLES RLS INFINITE RECURSION
-- ============================================
-- The issue: RLS policies on user_roles table reference user_roles itself,
-- causing infinite recursion when querying.
-- Solution: Use SECURITY DEFINER functions to bypass RLS checks

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can grant roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can revoke roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

-- Disable RLS temporarily to recreate policies
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create simple policies that don't cause recursion
-- Users can always view their own roles
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow insert/update/delete through service role only
-- Admins will use API endpoints with supabaseAdmin client
CREATE POLICY "Service role can manage all roles"
ON user_roles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- UPDATE HELPER FUNCTIONS TO USE SECURITY DEFINER
-- ============================================

-- These functions bypass RLS and are safe to use in other policies
-- SET search_path prevents search_path injection attacks
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = user_uuid
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin_or_moderator(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = user_uuid
        AND role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- UPDATE OTHER POLICIES TO USE HELPER FUNCTIONS
-- ============================================

-- Update event_reviews policies
DROP POLICY IF EXISTS "Admins and moderators can view all reviews" ON event_reviews;
CREATE POLICY "Admins and moderators can view all reviews"
ON event_reviews FOR SELECT
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins and moderators can create reviews" ON event_reviews;
CREATE POLICY "Admins and moderators can create reviews"
ON event_reviews FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Update events policies
DROP POLICY IF EXISTS "Admins and moderators can view all events" ON events;
CREATE POLICY "Admins and moderators can view all events"
ON events FOR SELECT
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins and moderators can update event status" ON events;
CREATE POLICY "Admins and moderators can update event status"
ON events FOR UPDATE
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- ============================================
-- NOTES
-- ============================================
-- After running this migration:
-- 1. Admin/moderator role management must be done through API endpoints
--    that use supabaseAdmin (service role) client
-- 2. Users can view their own roles
-- 3. Other policies can safely use is_admin() and is_admin_or_moderator()
--    functions without causing recursion
