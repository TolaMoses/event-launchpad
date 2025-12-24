# Database Migration Guide

## Apply the Event Type Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `migrations/add_event_type.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 3: Direct PostgreSQL Connection

```bash
# Connect to your database
psql postgresql://[user]:[password]@[host]:[port]/[database]

# Run the migration
\i migrations/add_event_type.sql
```

## Verify Migration

After running the migration, verify it was successful:

```sql
-- Check if event_type column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('event_type', 'setup_progress');

-- Should return:
-- event_type | text
-- setup_progress | jsonb
```

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Remove the new columns
ALTER TABLE events DROP COLUMN IF EXISTS event_type;
ALTER TABLE events DROP COLUMN IF EXISTS setup_progress;

-- Remove the index
DROP INDEX IF EXISTS events_event_type_idx;
```

## Important Notes

- **Existing Events**: All existing events will be set to `'quick_event'` type by default
- **Backup**: Always backup your database before running migrations
- **Testing**: Test the migration on a development/staging environment first
- **Downtime**: This migration should run quickly with minimal downtime

## Troubleshooting

### Error: Column already exists
If you get an error that the column already exists, the migration may have already been applied. Check your database schema.

### Error: Permission denied
Ensure you have the necessary permissions to alter the table structure. You may need to use a superuser account.

### Error: Constraint violation
If existing data violates the new constraints, you may need to clean up the data first before applying the migration.
