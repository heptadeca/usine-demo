/*
  # Make pw_hash Nullable in Clients Table

  ## Overview
  Since we're using Supabase Auth for authentication, we don't need to store
  password hashes in the clients table. This migration makes pw_hash nullable.

  ## Changes
  1. Alter clients table to make pw_hash column nullable
  2. Update existing records to set pw_hash to null where it's a placeholder

  ## Security
  - Authentication is handled by Supabase Auth (auth.users table)
  - Client records are linked to auth.users via matching IDs
  - RLS policies use auth.uid() for authorization
*/

-- Make pw_hash nullable
ALTER TABLE clients 
ALTER COLUMN pw_hash DROP NOT NULL;

-- Update existing records to null since we use Supabase Auth
UPDATE clients 
SET pw_hash = NULL 
WHERE pw_hash IS NOT NULL;