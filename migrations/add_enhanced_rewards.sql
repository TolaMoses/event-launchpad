-- Add support for multiple reward types and enhanced features

-- Update prize_details structure to support multiple rewards
-- The prize_details column will now be an array of reward objects
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS reward_types jsonb DEFAULT '[]'::jsonb;

-- Add custom point system configuration
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS point_system jsonb DEFAULT NULL;
-- Structure: { enabled: boolean, point_name: string, leaderboard_enabled: boolean }

-- Add roles and permissions configuration
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS roles_permissions jsonb DEFAULT NULL;
-- Structure: { roles: [{name: string, permissions: string[]}], assignments: [{user_id: string, role: string}] }

-- Update setup_progress to include new sections
-- Structure will be: { tasks: number, rewards: number, roles: number }

-- Add comment to explain the new structure
COMMENT ON COLUMN events.reward_types IS 'Array of reward configurations supporting multiple reward types simultaneously';
COMMENT ON COLUMN events.point_system IS 'Custom point system configuration with point name and leaderboard settings';
COMMENT ON COLUMN events.roles_permissions IS 'Team roles and permission assignments for event management';

-- Update existing events to have empty reward_types array
UPDATE events SET reward_types = '[]'::jsonb WHERE reward_types IS NULL;

-- Migrate existing prize_details to reward_types array (if prize_details exists)
UPDATE events 
SET reward_types = jsonb_build_array(prize_details)
WHERE prize_details IS NOT NULL AND reward_types = '[]'::jsonb;
