-- Add referrer_id column to task_submissions FIRST
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_submissions' AND column_name = 'referrer_id'
    ) THEN
        ALTER TABLE task_submissions ADD COLUMN referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create event_participants table to track users who have joined an event
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(event_id, user_id)
);

-- Create event_referrals table to track successful referrals
CREATE TABLE IF NOT EXISTS event_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, referred_user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_referrer_id ON event_participants(referrer_id);
CREATE INDEX IF NOT EXISTS idx_event_referrals_event_id ON event_referrals(event_id);
CREATE INDEX IF NOT EXISTS idx_event_referrals_referrer_id ON event_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_event_referrals_referred_user_id ON event_referrals(referred_user_id);

-- Enable RLS
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_participants
CREATE POLICY "Users can view event participants"
    ON event_participants FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own participation"
    ON event_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for event_referrals
CREATE POLICY "Users can view referrals"
    ON event_referrals FOR SELECT
    USING (true);

CREATE POLICY "System can insert referrals"
    ON event_referrals FOR INSERT
    WITH CHECK (true);

-- Function to mark user as joined when they complete a task
CREATE OR REPLACE FUNCTION mark_event_participation()
RETURNS TRIGGER AS $$
DECLARE
    v_event_id UUID;
    v_user_id UUID;
    v_referrer_id UUID;
    v_already_participated BOOLEAN;
BEGIN
    -- Get event_id directly from task_submissions
    v_event_id := NEW.event_id;
    v_user_id := NEW.user_id;

    -- Skip if event_id is null
    IF v_event_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check if user already participated in this event
    SELECT EXISTS (
        SELECT 1 FROM event_participants
        WHERE event_id = v_event_id AND user_id = v_user_id
    ) INTO v_already_participated;

    -- If this is their first task completion in the event
    IF NOT v_already_participated THEN
        -- Get referrer_id from the NEW record (will be NULL if column doesn't exist or wasn't set)
        BEGIN
            v_referrer_id := NEW.referrer_id;
        EXCEPTION
            WHEN undefined_column THEN
                v_referrer_id := NULL;
        END;

        -- Mark user as participant
        INSERT INTO event_participants (event_id, user_id, referrer_id)
        VALUES (v_event_id, v_user_id, v_referrer_id)
        ON CONFLICT (event_id, user_id) DO NOTHING;

        -- If there's a referrer, create a referral record
        IF v_referrer_id IS NOT NULL AND v_referrer_id != v_user_id THEN
            INSERT INTO event_referrals (event_id, referrer_id, referred_user_id)
            VALUES (v_event_id, v_referrer_id, v_user_id)
            ON CONFLICT (event_id, referred_user_id) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on task_submissions
DROP TRIGGER IF EXISTS trigger_mark_event_participation ON task_submissions;
CREATE TRIGGER trigger_mark_event_participation
    AFTER INSERT ON task_submissions
    FOR EACH ROW
    EXECUTE FUNCTION mark_event_participation();
