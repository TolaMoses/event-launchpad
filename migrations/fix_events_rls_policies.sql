-- Fix RLS policies for events table to allow users to view their own events

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "Users can insert their own events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;

-- Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own events
CREATE POLICY "Users can view their own events"
ON events
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Policy: Users can insert their own events
CREATE POLICY "Users can insert their own events"
ON events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own events
CREATE POLICY "Users can update their own events"
ON events
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own events
CREATE POLICY "Users can delete their own events"
ON events
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Policy: Allow public to view published events (for event participation)
CREATE POLICY "Public can view published events"
ON events
FOR SELECT
TO anon, authenticated
USING (status = 'published');
