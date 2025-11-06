/*
  # Reset User Passwords

  ## Overview
  Updates passwords for existing auth users to ensure login works correctly.

  ## Changes
  1. Updates admin user password to Admin123!
  2. Updates client user password to Client123!

  ## Security
  - Uses bcrypt password hashing
  - Confirms emails immediately for demo purposes

  ## Credentials
  - Admin: admin@example.com / Admin123!
  - Client: client@example.com / Client123!
*/

-- Update admin user password
UPDATE auth.users
SET 
  encrypted_password = crypt('Admin123!', gen_salt('bf')),
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'admin@example.com';

-- Update client user password  
UPDATE auth.users
SET 
  encrypted_password = crypt('Client123!', gen_salt('bf')),
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'client@example.com';