/*
  # Add CASCADE DELETE for Clients

  ## Summary
  This migration enables automatic cleanup of all related data when a client is deleted,
  including both database tables and authentication records.

  ## Changes Made

  ### 1. Update Foreign Key Constraints to CASCADE
  Modifies the following foreign keys to use `ON DELETE CASCADE`:
  - `bots.owner_client_id` → `clients.id`
  - `sessions.client_id` → `clients.id`
  - `bot_client_access.client_id` → `clients.id`

  ### 2. Create Trigger for auth.users Cleanup
  Creates a database trigger that automatically deletes the corresponding user from
  Supabase's `auth.users` table when a client is deleted from the `clients` table.

  ## Behavior After Migration

  When a client is deleted:
  1. ✅ All bots owned by the client are deleted (CASCADE)
  2. ✅ All sessions belonging to the client are deleted (CASCADE)
  3. ✅ All bot_client_access entries for the client are deleted (CASCADE)
  4. ✅ All datasources are deleted (via bots CASCADE)
  5. ✅ All messages are deleted (via sessions CASCADE)
  6. ✅ The user is removed from auth.users (via trigger)

  ## Security Impact
  - Simplifies client deletion logic (no need for manual cleanup)
  - Ensures data consistency across auth.users and clients tables
  - Maintains RLS security policies
  - Requires only one DELETE query instead of multiple
*/

-- ==========================================
-- Step 1: Update Foreign Key Constraints
-- ==========================================

-- Drop existing constraints
ALTER TABLE bots DROP CONSTRAINT IF EXISTS bots_owner_client_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_client_id_fkey;
ALTER TABLE bot_client_access DROP CONSTRAINT IF EXISTS bot_client_access_client_id_fkey;

-- Recreate with ON DELETE CASCADE
ALTER TABLE bots
  ADD CONSTRAINT bots_owner_client_id_fkey
  FOREIGN KEY (owner_client_id)
  REFERENCES clients(id)
  ON DELETE CASCADE;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_client_id_fkey
  FOREIGN KEY (client_id)
  REFERENCES clients(id)
  ON DELETE CASCADE;

ALTER TABLE bot_client_access
  ADD CONSTRAINT bot_client_access_client_id_fkey
  FOREIGN KEY (client_id)
  REFERENCES clients(id)
  ON DELETE CASCADE;

-- ==========================================
-- Step 2: Create Trigger for auth.users
-- ==========================================

-- Create function to delete user from auth.users
CREATE OR REPLACE FUNCTION delete_auth_user_on_client_delete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete the user from auth.users
  -- This uses SECURITY DEFINER to run with elevated privileges
  DELETE FROM auth.users WHERE id = OLD.id;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block the client deletion
    RAISE WARNING 'Failed to delete auth user %: %', OLD.id, SQLERRM;
    RETURN OLD;
END;
$$;

-- Create trigger that fires AFTER client deletion
CREATE TRIGGER trigger_delete_auth_user_after_client_delete
  AFTER DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION delete_auth_user_on_client_delete();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION delete_auth_user_on_client_delete() TO authenticated;
