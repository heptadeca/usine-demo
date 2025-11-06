/*
  # Create Trigger for Automatic Client Creation

  ## Summary
  This migration creates a database trigger that automatically inserts a record
  into the clients table whenever a new user is created in auth.users.

  ## Changes Made
  1. Creates a trigger on auth.users that fires AFTER INSERT
  2. The trigger calls the handle_new_user() function which already exists
  3. This ensures every auth.users record has a corresponding clients record

  ## Why This is Needed
  - The handle_new_user() function was defined but never attached to a trigger
  - Without this trigger, users created in auth.users don't automatically get
    entries in the clients table
  - This caused the "client created successfully" message but no visible client

  ## Security
  - Uses the existing handle_new_user() function with SECURITY DEFINER
  - Maintains RLS policies on the clients table
  - Only affects new user creation, not existing users
*/

-- Drop the trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger that fires AFTER a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;
