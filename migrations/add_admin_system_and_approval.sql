-- ============================================
-- ADMIN & MODERATOR SYSTEM
-- ============================================

-- Create user_roles table to track admin/moderator permissions
CREATE TABLE IF NOT EXISTS user_roles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            text NOT NULL CHECK (role IN ('admin', 'moderator', 'user')),
    granted_by      uuid REFERENCES users(id) ON DELETE SET NULL,
    granted_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

CREATE INDEX user_roles_user_idx ON user_roles(user_id);
CREATE INDEX user_roles_role_idx ON user_roles(role);

-- Add RLS policies for user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
);

-- Admins can grant roles
CREATE POLICY "Admins can grant roles"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
);

-- Admins can revoke roles
CREATE POLICY "Admins can revoke roles"
ON user_roles FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
);

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- EVENT APPROVAL SYSTEM
-- ============================================

-- Update events status to include review/approved/rejected
-- Current: 'draft', 'active', 'ended', 'cancelled'
-- Add: 'review', 'approved', 'rejected'
-- Note: Quick events go: draft → review → approved/rejected → active
--       Community events go: draft → active (no approval needed)

-- Create event_reviews table for rejection reasons
CREATE TABLE IF NOT EXISTS event_reviews (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    reviewer_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          text NOT NULL CHECK (status IN ('approved', 'rejected')),
    reason          text,
    reviewed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX event_reviews_event_idx ON event_reviews(event_id);
CREATE INDEX event_reviews_reviewer_idx ON event_reviews(reviewer_id);

-- Add RLS policies for event_reviews
ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;

-- Event creators can view reviews of their events
CREATE POLICY "Event creators can view reviews"
ON event_reviews FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_reviews.event_id
        AND events.created_by = auth.uid()
    )
);

-- Admins and moderators can view all reviews
CREATE POLICY "Admins and moderators can view all reviews"
ON event_reviews FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
);

-- Admins and moderators can create reviews
CREATE POLICY "Admins and moderators can create reviews"
ON event_reviews FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
);

-- ============================================
-- UPDATE EVENTS RLS POLICIES FOR APPROVAL
-- ============================================

-- Drop old public view policy
DROP POLICY IF EXISTS "Public can view active events" ON events;

-- Public can view approved and active events
CREATE POLICY "Public can view approved and active events"
ON events FOR SELECT
TO anon, authenticated
USING (status IN ('approved', 'active'));

-- Admins and moderators can view all events (including pending review)
CREATE POLICY "Admins and moderators can view all events"
ON events FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
);

-- Admins and moderators can update event status
CREATE POLICY "Admins and moderators can update event status"
ON events FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
);

-- ============================================
-- UPDATE TASKS RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Public can view tasks of active events" ON tasks;

-- Public can view tasks of approved and active events
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
-- UPDATE EVENT_PARTICIPANTS RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can join active events" ON event_participants;

-- Users can join approved and active events (but not their own)
CREATE POLICY "Users can join approved and active events"
ON event_participants FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_participants.event_id
        AND events.status IN ('approved', 'active')
        AND events.created_by != auth.uid()  -- Prevent joining own event
    )
);

-- ============================================
-- UPDATE TASK_SUBMISSIONS RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can submit tasks" ON task_submissions;

-- Users can submit tasks for approved and active events (but not their own)
CREATE POLICY "Users can submit tasks for approved and active events"
ON task_submissions FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM tasks
        JOIN events ON events.id = tasks.event_id
        WHERE tasks.id = task_submissions.task_id
        AND events.status IN ('approved', 'active')
        AND events.created_by != auth.uid()  -- Prevent submitting to own event
    )
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = user_uuid
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin or moderator
CREATE OR REPLACE FUNCTION is_admin_or_moderator(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = user_uuid
        AND role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT INITIAL ADMIN ROLE
-- ============================================
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
-- You can find it by running: SELECT id FROM auth.users WHERE email = 'your@email.com';
-- Or from the user_metadata in your JWT token

-- IMPORTANT: Uncomment and replace with your actual user ID
-- INSERT INTO user_roles (user_id, role, granted_by)
-- VALUES ('YOUR_USER_ID', 'admin', 'YOUR_USER_ID')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- To find your user ID, run this query:
-- SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'your@email.com';
-- Or check the 'sub' field in your JWT token
