-- Add username and profile features to users table

-- Add username column (unique)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Add profile picture column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_picture text;

-- Add connected accounts column (stores Discord, Telegram, etc.)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS connected_accounts jsonb DEFAULT '{}'::jsonb;
-- Structure: { discord: { id: string, username: string }, telegram: { id: string, username: string } }

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);

-- Add constraint to ensure username is lowercase and alphanumeric with underscores
ALTER TABLE users 
ADD CONSTRAINT username_format_check 
CHECK (username ~ '^[a-z0-9_]{3,20}$');

-- Add comments
COMMENT ON COLUMN users.username IS 'Unique username for the user (3-20 chars, lowercase alphanumeric with underscores)';
COMMENT ON COLUMN users.profile_picture IS 'Path to user profile picture';
COMMENT ON COLUMN users.connected_accounts IS 'Connected social accounts (Discord, Telegram, etc.)';
