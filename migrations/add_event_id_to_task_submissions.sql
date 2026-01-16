-- Add event_id column to task_submissions table
-- This is needed because tasks are stored as JSON in events table, not in a separate tasks table

-- Add event_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_submissions' 
        AND column_name = 'event_id'
    ) THEN
        ALTER TABLE task_submissions 
        ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE;
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_task_submissions_event_id 
        ON task_submissions(event_id);
        
        -- Create composite index for common queries
        CREATE INDEX IF NOT EXISTS idx_task_submissions_event_user 
        ON task_submissions(event_id, user_id);
    END IF;
END $$;

-- Make task_id column nullable since we now store it in the submission JSON
-- This allows backward compatibility while transitioning to the new structure
ALTER TABLE task_submissions 
ALTER COLUMN task_id DROP NOT NULL;

-- Update RLS policies to work with event_id instead of task_id
-- Drop old policies that reference tasks table
DROP POLICY IF EXISTS "Users and creators can view submissions" ON task_submissions;
DROP POLICY IF EXISTS "Users can submit tasks for approved and active events" ON task_submissions;
DROP POLICY IF EXISTS "Users and creators can update submissions" ON task_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON task_submissions;
DROP POLICY IF EXISTS "Users can submit tasks" ON task_submissions;
DROP POLICY IF EXISTS "Users can update their own submissions" ON task_submissions;
DROP POLICY IF EXISTS "Event creators can view submissions" ON task_submissions;
DROP POLICY IF EXISTS "Event creators can update submission status" ON task_submissions;

-- Create new policies using event_id
CREATE POLICY "Users can view their own submissions"
ON task_submissions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Event creators can view submissions for their events"
ON task_submissions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = task_submissions.event_id
        AND events.created_by = auth.uid()
    )
);

CREATE POLICY "Users can submit for approved and active events"
ON task_submissions FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM events
        WHERE events.id = task_submissions.event_id
        AND events.status IN ('approved', 'active')
        AND events.created_by != auth.uid()  -- Prevent submitting to own event
    )
);

CREATE POLICY "Users can update their own unverified submissions"
ON task_submissions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND verified = false)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Event creators can update submissions for their events"
ON task_submissions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = task_submissions.event_id
        AND events.created_by = auth.uid()
    )
);

-- Note: task_id column can remain for backward compatibility
-- but is no longer used as a foreign key. The task_id is now stored
-- in the submission JSON field to identify which task within the event
-- this submission is for.
