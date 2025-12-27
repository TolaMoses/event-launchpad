-- ============================================
-- COMPREHENSIVE RLS POLICIES FOR ALL TABLES
-- ============================================

-- ============================================
-- USERS TABLE
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Public can view user profiles" ON users;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert their own profile"
ON users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Public can view basic user info (username, avatar) for leaderboards/participants
CREATE POLICY "Public can view user profiles"
ON users FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================
-- SOCIAL CONNECTIONS TABLE
-- ============================================
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own connections" ON social_connections;
DROP POLICY IF EXISTS "Users can insert their own connections" ON social_connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON social_connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON social_connections;

-- Users can view their own social connections
CREATE POLICY "Users can view their own connections"
ON social_connections FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own social connections
CREATE POLICY "Users can insert their own connections"
ON social_connections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own social connections
CREATE POLICY "Users can update their own connections"
ON social_connections FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own social connections
CREATE POLICY "Users can delete their own connections"
ON social_connections FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- EVENTS TABLE
-- ============================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "Users can insert their own events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;
DROP POLICY IF EXISTS "Public can view published events" ON events;
DROP POLICY IF EXISTS "Public can view active events" ON events;

-- Users can view their own events
CREATE POLICY "Users can view their own events"
ON events FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Users can insert their own events
CREATE POLICY "Users can insert their own events"
ON events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Users can update their own events
CREATE POLICY "Users can update their own events"
ON events FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Users can delete their own events
CREATE POLICY "Users can delete their own events"
ON events FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Public can view active events (for participation)
CREATE POLICY "Public can view active events"
ON events FOR SELECT
TO anon, authenticated
USING (status = 'active');

-- ============================================
-- TASKS TABLE
-- ============================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Event creators can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Public can view tasks of published events" ON tasks;
DROP POLICY IF EXISTS "Public can view tasks of active events" ON tasks;

-- Event creators can manage all tasks for their events
CREATE POLICY "Event creators can manage tasks"
ON tasks FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = tasks.event_id
        AND events.created_by = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = tasks.event_id
        AND events.created_by = auth.uid()
    )
);

-- Public can view tasks of active events
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
-- EVENT PARTICIPANTS TABLE
-- ============================================
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own participations" ON event_participants;
DROP POLICY IF EXISTS "Users can join published events" ON event_participants;
DROP POLICY IF EXISTS "Users can join active events" ON event_participants;
DROP POLICY IF EXISTS "Event creators can view participants" ON event_participants;

-- Users can view their own participations
CREATE POLICY "Users can view their own participations"
ON event_participants FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can join active events
CREATE POLICY "Users can join active events"
ON event_participants FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_participants.event_id
        AND events.status = 'active'
    )
);

-- Event creators can view all participants of their events
CREATE POLICY "Event creators can view participants"
ON event_participants FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_participants.event_id
        AND events.created_by = auth.uid()
    )
);

-- ============================================
-- TASK SUBMISSIONS TABLE
-- ============================================
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own submissions" ON task_submissions;
DROP POLICY IF EXISTS "Users can submit tasks" ON task_submissions;
DROP POLICY IF EXISTS "Users can update their own submissions" ON task_submissions;
DROP POLICY IF EXISTS "Event creators can view submissions" ON task_submissions;

-- Users can view their own submissions
CREATE POLICY "Users can view their own submissions"
ON task_submissions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can submit tasks for active events
CREATE POLICY "Users can submit tasks"
ON task_submissions FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM tasks
        JOIN events ON events.id = tasks.event_id
        WHERE tasks.id = task_submissions.task_id
        AND events.status = 'active'
    )
);

-- Users can update their own unverified submissions
CREATE POLICY "Users can update their own submissions"
ON task_submissions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND verified = false)
WITH CHECK (auth.uid() = user_id);

-- Event creators can view all submissions for their events
CREATE POLICY "Event creators can view submissions"
ON task_submissions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tasks
        JOIN events ON events.id = tasks.event_id
        WHERE tasks.id = task_submissions.task_id
        AND events.created_by = auth.uid()
    )
);

-- Event creators can update submission status (approve/reject)
CREATE POLICY "Event creators can update submission status"
ON task_submissions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tasks
        JOIN events ON events.id = tasks.event_id
        WHERE tasks.id = task_submissions.task_id
        AND events.created_by = auth.uid()
    )
);

-- ============================================
-- EVENT WINNERS TABLE
-- ============================================
ALTER TABLE event_winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Event creators can manage winners" ON event_winners;
DROP POLICY IF EXISTS "Public can view winners of completed events" ON event_winners;

-- Event creators can manage winners for their events
CREATE POLICY "Event creators can manage winners"
ON event_winners FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_winners.event_id
        AND events.created_by = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_winners.event_id
        AND events.created_by = auth.uid()
    )
);

-- Public can view winners of completed events
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
-- TASK VERIFICATION LOGS TABLE
-- ============================================
ALTER TABLE task_verification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Event creators can view verification logs" ON task_verification_logs;
DROP POLICY IF EXISTS "System can insert verification logs" ON task_verification_logs;

-- Event creators can view verification logs for their events
CREATE POLICY "Event creators can view verification logs"
ON task_verification_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM task_submissions
        JOIN tasks ON tasks.id = task_submissions.task_id
        JOIN events ON events.id = tasks.event_id
        WHERE task_submissions.id = task_verification_logs.task_submission_id
        AND events.created_by = auth.uid()
    )
);

-- System/authenticated users can insert verification logs
CREATE POLICY "System can insert verification logs"
ON task_verification_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- GRANT USAGE ON SEQUENCES (if needed)
-- ============================================
-- This ensures authenticated users can use auto-increment IDs
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
