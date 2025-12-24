-- Add event_type column to events table
-- event_type can be 'quick_event' or 'community'
ALTER TABLE events 
ADD COLUMN event_type text NOT NULL DEFAULT 'quick_event';

-- Add check constraint to ensure valid event types
ALTER TABLE events 
ADD CONSTRAINT events_event_type_check 
CHECK (event_type IN ('quick_event', 'community'));

-- Add setup_progress column for community events
-- Tracks completion percentage of tasks and prize configuration
ALTER TABLE events 
ADD COLUMN setup_progress jsonb DEFAULT '{"tasks": 0, "rewards": 0}'::jsonb;

-- Create index for event_type
CREATE INDEX events_event_type_idx ON events(event_type);

-- Update existing events to be 'quick_event' type
UPDATE events SET event_type = 'quick_event' WHERE event_type IS NULL;
