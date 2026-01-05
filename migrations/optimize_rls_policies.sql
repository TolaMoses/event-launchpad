-- ============================================
-- OPTIMIZE RLS POLICIES FOR PERFORMANCE
-- ============================================
-- This migration fixes performance warnings by:
-- 1. Replacing auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row
-- 2. Removing duplicate policies
-- 3. Removing duplicate indexes

-- ============================================
-- USERS TABLE - Fix duplicate policies and optimize
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Public can view user profiles" ON users;

-- Create optimized policies with (SELECT auth.uid())
-- Combine SELECT policies into one permissive policy
CREATE POLICY "Users and public can view profiles"
ON users FOR SELECT
TO anon, authenticated
USING (true); -- Public can view all profiles for leaderboards

CREATE POLICY "Users can insert their own profile"
ON users FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

-- Remove duplicate indexes
DROP INDEX IF EXISTS users_wallet_unique;
-- Keep users_wallet_address_key

-- ============================================
-- SOCIAL CONNECTIONS TABLE - Optimize
-- ============================================

DROP POLICY IF EXISTS "Users can view their own connections" ON social_connections;
DROP POLICY IF EXISTS "Users can insert their own connections" ON social_connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON social_connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON social_connections;

CREATE POLICY "Users can view their own connections"
ON social_connections FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own connections"
ON social_connections FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own connections"
ON social_connections FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own connections"
ON social_connections FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- EVENTS TABLE - Optimize
-- ============================================

DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "Users can insert their own events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;
DROP POLICY IF EXISTS "Public can view published events" ON events;
DROP POLICY IF EXISTS "Public can view active events" ON events;

-- Combine view policies
CREATE POLICY "Users and public can view events"
ON events FOR SELECT
TO anon, authenticated
USING (
    (SELECT auth.uid()) = created_by 
    OR status = 'active'
);

CREATE POLICY "Users can insert their own events"
ON events FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Users can update their own events"
ON events FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = created_by)
WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Users can delete their own events"
ON events FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = created_by);

-- ============================================
-- TASKS TABLE - Optimize
-- ============================================

DROP POLICY IF EXISTS "Event creators can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Public can view tasks of published events" ON tasks;
DROP POLICY IF EXISTS "Public can view tasks of active events" ON tasks;

CREATE POLICY "Event creators can manage tasks"
ON tasks FOR ALL
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

CREATE POLICY "Public can view tasks of active events"
ON tasks FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = tasks.event_id
        AND events.status = 'active'
    )
);

-- ============================================
-- EVENT PARTICIPANTS TABLE - Optimize
-- ============================================

DROP POLICY IF EXISTS "Users can view their own participations" ON event_participants;
DROP POLICY IF EXISTS "Users can join published events" ON event_participants;
DROP POLICY IF EXISTS "Users can join active events" ON event_participants;
DROP POLICY IF EXISTS "Event creators can view participants" ON event_participants;

CREATE POLICY "Users and creators can view participations"
ON event_participants FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_participants.event_id
        AND events.created_by = (SELECT auth.uid())
    )
);

CREATE POLICY "Users can join active events"
ON event_participants FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_participants.event_id
        AND events.status = 'active'
    )
);

-- ============================================
-- TASK SUBMISSIONS TABLE - Optimize
-- ============================================

DROP POLICY IF EXISTS "Users can view their own submissions" ON task_submissions;
DROP POLICY IF EXISTS "Users can submit tasks" ON task_submissions;
DROP POLICY IF EXISTS "Users can update their own submissions" ON task_submissions;
DROP POLICY IF EXISTS "Event creators can view submissions" ON task_submissions;
DROP POLICY IF EXISTS "Event creators can update submission status" ON task_submissions;

-- Combine view policies
CREATE POLICY "Users and creators can view submissions"
ON task_submissions FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
        SELECT 1 FROM tasks
        JOIN events ON events.id = tasks.event_id
        WHERE tasks.id = task_submissions.task_id
        AND events.created_by = (SELECT auth.uid())
    )
);

CREATE POLICY "Users can submit tasks"
ON task_submissions FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
        SELECT 1 FROM tasks
        JOIN events ON events.id = tasks.event_id
        WHERE tasks.id = task_submissions.task_id
        AND events.status = 'active'
    )
);

-- Combine update policies (users can update unverified, creators can update any)
CREATE POLICY "Users and creators can update submissions"
ON task_submissions FOR UPDATE
TO authenticated
USING (
    ((SELECT auth.uid()) = user_id AND verified = false)
    OR EXISTS (
        SELECT 1 FROM tasks
        JOIN events ON events.id = tasks.event_id
        WHERE tasks.id = task_submissions.task_id
        AND events.created_by = (SELECT auth.uid())
    )
)
WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    OR EXISTS (
        SELECT 1 FROM tasks
        JOIN events ON events.id = tasks.event_id
        WHERE tasks.id = task_submissions.task_id
        AND events.created_by = (SELECT auth.uid())
    )
);

-- ============================================
-- EVENT WINNERS TABLE - Optimize
-- ============================================

DROP POLICY IF EXISTS "Event creators can manage winners" ON event_winners;
DROP POLICY IF EXISTS "Public can view winners of completed events" ON event_winners;

CREATE POLICY "Event creators can manage winners"
ON event_winners FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_winners.event_id
        AND events.created_by = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_winners.event_id
        AND events.created_by = (SELECT auth.uid())
    )
);

CREATE POLICY "Public can view winners of completed events"
ON event_winners FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_winners.event_id
        AND events.status = 'completed'
    )
);

-- ============================================
-- TASK VERIFICATION LOGS TABLE - Optimize
-- ============================================

DROP POLICY IF EXISTS "Event creators can view verification logs" ON task_verification_logs;
DROP POLICY IF EXISTS "System can insert verification logs" ON task_verification_logs;

CREATE POLICY "Event creators can view verification logs"
ON task_verification_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM task_submissions
        JOIN tasks ON tasks.id = task_submissions.task_id
        JOIN events ON events.id = tasks.event_id
        WHERE task_submissions.id = task_verification_logs.task_submission_id
        AND events.created_by = (SELECT auth.uid())
    )
);

CREATE POLICY "System can insert verification logs"
ON task_verification_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- USER ROLES TABLE - Optimize (from admin system)
-- ============================================

DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can grant roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can revoke roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;

CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'admin'
    )
);

CREATE POLICY "Admins can grant roles"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'admin'
    )
);

CREATE POLICY "Admins can revoke roles"
ON user_roles FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'admin'
    )
);

CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- EVENT REVIEWS TABLE - Optimize
-- ============================================

DROP POLICY IF EXISTS "Event creators can view reviews" ON event_reviews;
DROP POLICY IF EXISTS "Admins and moderators can view all reviews" ON event_reviews;
DROP POLICY IF EXISTS "Admins and moderators can create reviews" ON event_reviews;

-- Combine SELECT policies
CREATE POLICY "Event creators and admins can view reviews"
ON event_reviews FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_reviews.event_id
        AND events.created_by = (SELECT auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role IN ('admin', 'moderator')
    )
);

CREATE POLICY "Admins and moderators can create reviews"
ON event_reviews FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role IN ('admin', 'moderator')
    )
);

-- ============================================
-- EVENTS TABLE - Add admin/moderator policies
-- ============================================

DROP POLICY IF EXISTS "Public can view approved and active events" ON events;
DROP POLICY IF EXISTS "Admins and moderators can view all events" ON events;
DROP POLICY IF EXISTS "Admins and moderators can update event status" ON events;

-- Update the combined view policy to include approved events
DROP POLICY IF EXISTS "Users and public can view events" ON events;

CREATE POLICY "Users and public can view events"
ON events FOR SELECT
TO anon, authenticated
USING (
    (SELECT auth.uid()) = created_by 
    OR status IN ('approved', 'active')
    OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role IN ('admin', 'moderator')
    )
);

-- Combine UPDATE policies (users update own, admins update any)
DROP POLICY IF EXISTS "Users can update their own events" ON events;

CREATE POLICY "Users and admins can update events"
ON events FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) = created_by
    OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role IN ('admin', 'moderator')
    )
)
WITH CHECK (
    (SELECT auth.uid()) = created_by
    OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role IN ('admin', 'moderator')
    )
);

-- ============================================
-- TASKS TABLE - Remove duplicate SELECT policies
-- ============================================

DROP POLICY IF EXISTS "Public can view tasks of approved and active events" ON tasks;
DROP POLICY IF EXISTS "Public can view tasks of active events" ON tasks;

-- Recreate with single optimized policy
CREATE POLICY "Public can view tasks of approved and active events"
ON tasks FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = tasks.event_id
        AND events.status IN ('approved', 'active')
    )
);

-- ============================================
-- EVENT PARTICIPANTS TABLE - Remove duplicate INSERT policies
-- ============================================

DROP POLICY IF EXISTS "Users can join approved and active events" ON event_participants;
DROP POLICY IF EXISTS "Users can join active events" ON event_participants;

CREATE POLICY "Users can join approved and active events"
ON event_participants FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_participants.event_id
        AND events.status IN ('approved', 'active')
        AND events.created_by != (SELECT auth.uid())
    )
);

-- ============================================
-- TASK SUBMISSIONS TABLE - Remove duplicate INSERT policies
-- ============================================

DROP POLICY IF EXISTS "Users can submit tasks for approved and active events" ON task_submissions;
DROP POLICY IF EXISTS "Users can submit tasks" ON task_submissions;

CREATE POLICY "Users can submit tasks for approved and active events"
ON task_submissions FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
        SELECT 1 FROM tasks
        JOIN events ON events.id = tasks.event_id
        WHERE tasks.id = task_submissions.task_id
        AND events.status IN ('approved', 'active')
        AND events.created_by != (SELECT auth.uid())
    )
);

-- ============================================
-- SOCIAL CONNECTIONS TABLE - Remove duplicate UPDATE policies
-- ============================================

DROP POLICY IF EXISTS "users upsert own connections (update)" ON social_connections;
-- Keep "Users can update their own connections" which is already optimized above

-- ============================================
-- EVENT WINNERS TABLE - Combine duplicate SELECT policies
-- ============================================

DROP POLICY IF EXISTS "Event creators can manage winners" ON event_winners;
DROP POLICY IF EXISTS "Public can view winners of completed events" ON event_winners;

-- Recreate with combined policy
CREATE POLICY "Event creators and public can view winners"
ON event_winners FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_winners.event_id
        AND (
            events.created_by = (SELECT auth.uid())
            OR events.status = 'completed'
        )
    )
);

CREATE POLICY "Event creators can manage winners"
ON event_winners FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_winners.event_id
        AND events.created_by = (SELECT auth.uid())
    )
);

CREATE POLICY "Event creators can update winners"
ON event_winners FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_winners.event_id
        AND events.created_by = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_winners.event_id
        AND events.created_by = (SELECT auth.uid())
    )
);

CREATE POLICY "Event creators can delete winners"
ON event_winners FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_winners.event_id
        AND events.created_by = (SELECT auth.uid())
    )
);
