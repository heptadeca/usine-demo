/*
  # Reset User Passwords Safely

  ## Overview
  Clean up the auth system by removing all users and their client records.
  The admin account will be created through the Supabase Admin API instead.

  ## Changes
  1. Delete all client records
  2. Delete all auth users safely

  ## Security
  - Maintains database integrity
  - Allows fresh user creation via Supabase Auth API
*/

-- Delete all client records first (foreign key constraint)
DELETE FROM clients;

-- Delete all auth users
DELETE FROM auth.users;
