# Database Migration Guide

## User Settings Migration

This guide explains how to safely migrate your production database to include the new user settings fields without losing existing data.

### What the Migration Does

The migration script will:

1. Add `preferred_contact_method` column (nullable, no default)
2. Add `discord_username` column (nullable)
3. Add `display_name` column (nullable)
4. Preserve all existing user data
5. Set existing users' `preferred_contact_method` to `NULL` (no default)

### Running the Migration

#### Option 1: Local Development

```bash
cd trackflow/backend
python tools/migrate_user_settings.py
```

#### Option 2: Production (Supabase)

1. **Backup your database first** (recommended)
2. Connect to your Supabase database
3. Run the migration script against your production database

#### Option 3: Manual SQL (if you prefer)

If you want to run the SQL manually in Supabase:

```sql
-- Add the new columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_username VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR;
```

### Safety Features

- **Idempotent**: The script can be run multiple times safely
- **Checks existing columns**: Won't try to add columns that already exist
- **Transaction safety**: Uses database transactions with rollback on error
- **Data preservation**: All existing user data is preserved
- **Confirmation prompt**: Asks for confirmation before running

### What Happens to Existing Users

- **Existing users**: Will have `preferred_contact_method` set to `NULL` (no default)
- **New users**: Will start with no preferred contact method
- **All other data**: Email, username, etc. remain unchanged

### Verification

After running the migration, you can verify it worked by:

1. Checking the user settings page loads correctly
2. Verifying new users can set their preferred contact method
3. Confirming existing users can update their settings

### Rollback Plan

If something goes wrong, you can rollback by:

```sql
-- Remove the new columns (WARNING: This will lose data in those columns)
ALTER TABLE users DROP COLUMN IF EXISTS preferred_contact_method;
ALTER TABLE users DROP COLUMN IF EXISTS discord_username;
ALTER TABLE users DROP COLUMN IF EXISTS display_name;
```

**Note**: Only use rollback if absolutely necessary, as it will delete any data users have entered in these fields.

### Troubleshooting

**Error: "Column already exists"**

- This is normal if the migration was already run
- The script will skip existing columns

**Error: "Permission denied"**

- Make sure your database user has ALTER TABLE permissions
- Check your database connection settings

**Error: "Connection failed"**

- Verify your database URL is correct
- Check if your database is accessible from your current location
