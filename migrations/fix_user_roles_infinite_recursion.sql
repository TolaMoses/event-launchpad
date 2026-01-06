-- ============================================
-- FIX INFINITE RECURSION IN USER_ROLES POLICIES
-- ============================================
-- The problem: Policies on user_roles table check user_roles to determine admin status
-- This creates infinite recursion: "To check if you can read user_roles, we need to read user_roles"

-- Solution: Use security definer functions that bypass RLS

-- ============================================
-- DROP EXISTING PROBLEMATIC POLICIES
-- ============================================

DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can grant roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can revoke roles" ON user_roles;

-- ============================================
-- CREATE SECURITY DEFINER HELPER FUNCTIONS
-- ============================================

-- Function to check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Function to check if current user is admin or moderator (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  );
$$;

-- ============================================
-- RECREATE POLICIES WITHOUT RECURSION
-- ============================================

-- Users can always view their own roles (no recursion)
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Admins can view all roles (uses security definer function)
CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can grant roles (uses security definer function)
CREATE POLICY "Admins can grant roles"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Admins can update roles (uses security definer function)
CREATE POLICY "Admins can update roles"
ON user_roles FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admins can revoke roles (uses security definer function)
CREATE POLICY "Admins can revoke roles"
ON user_roles FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================
-- UPDATE OTHER TABLES TO USE HELPER FUNCTIONS
-- ============================================

-- Fix events table policies
DROP POLICY IF EXISTS "Users and public can view events" ON events;
DROP POLICY IF EXISTS "Users and admins can update events" ON events;

CREATE POLICY "Users and public can view events"
ON events FOR SELECT
TO anon, authenticated
USING (
    (SELECT auth.uid()) = created_by 
    OR status IN ('approved', 'active')
    OR public.is_admin_or_moderator()
);

CREATE POLICY "Users and admins can update events"
ON events FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) = created_by
    OR public.is_admin_or_moderator()
)
WITH CHECK (
    (SELECT auth.uid()) = created_by
    OR public.is_admin_or_moderator()
);

-- Fix event_reviews table policies
DROP POLICY IF EXISTS "Event creators and admins can view reviews" ON event_reviews;
DROP POLICY IF EXISTS "Admins and moderators can create reviews" ON event_reviews;

CREATE POLICY "Event creators and admins can view reviews"
ON event_reviews FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_reviews.event_id
        AND events.created_by = (SELECT auth.uid())
    )
    OR public.is_admin_or_moderator()
);

CREATE POLICY "Admins and moderators can create reviews"
ON event_reviews FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_moderator());

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_moderator() TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this migration, test with:
-- SELECT public.is_admin(); -- Should return true/false
-- SELECT * FROM user_roles; -- Should work without recursion error
