/*
  # Clean Up Users and Create Admin Account

  ## Overview
  Removes all existing users and creates a single admin account with secure credentials.

  ## Changes
  1. Delete all records from clients table
  2. Delete all users from auth.users
  3. Create new admin user with email: admin@demo.com
  4. Create corresponding client record with admin role

  ## New Admin Credentials
  - Email: admin@demo.com
  - Password: Adm1n$ecur3!2025
  - Role: admin

  ## Security
  - Uses bcrypt password hashing with salt
  - Email confirmed immediately for production use
  - Strong password meeting security requirements
*/

-- Delete all client records
DELETE FROM clients;

-- Delete all auth users
DELETE FROM auth.users;

-- Create admin user in auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@demo.com',
  crypt('Adm1n$ecur3!2025', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"],"role":"admin"}',
  '{"role":"admin"}',
  'authenticated',
  'authenticated'
);

-- Create admin record in clients table
INSERT INTO clients (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'admin@demo.com';