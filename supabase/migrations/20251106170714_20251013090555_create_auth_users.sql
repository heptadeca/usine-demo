/*
  # Create Supabase Auth Users

  ## Overview
  Creates users in Supabase Auth (auth.users) and links them to the clients table.

  ## Changes
  1. Creates admin user in auth.users
  2. Creates client user in auth.users
  3. Updates clients table records to match auth user IDs

  ## Security
  - Users are created with secure passwords
  - Email confirmations are disabled for immediate access
  - IDs are synchronized between auth.users and clients table

  ## Important Notes
  - Admin email: admin@example.com, password: Admin123!
  - Client email: client@example.com, password: Client123!
  - These are demo credentials and should be changed in production
*/

-- Create admin user in auth.users if not exists
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@example.com';
  
  IF admin_user_id IS NULL THEN
    -- Create admin user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@example.com',
      crypt('Admin123!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO admin_user_id;

    -- Update clients table with auth user ID
    UPDATE clients 
    SET id = admin_user_id 
    WHERE email = 'admin@example.com';
    
    -- If client doesn't exist, create it
    INSERT INTO clients (id, email, pw_hash, role)
    VALUES (admin_user_id, 'admin@example.com', crypt('Admin123!', gen_salt('bf')), 'admin')
    ON CONFLICT (email) DO UPDATE SET id = admin_user_id;
  END IF;
END $$;

-- Create client user in auth.users if not exists
DO $$
DECLARE
  client_user_id uuid;
BEGIN
  -- Check if client user already exists
  SELECT id INTO client_user_id FROM auth.users WHERE email = 'client@example.com';
  
  IF client_user_id IS NULL THEN
    -- Create client user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'client@example.com',
      crypt('Client123!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO client_user_id;

    -- Update clients table with auth user ID
    UPDATE clients 
    SET id = client_user_id 
    WHERE email = 'client@example.com';
    
    -- If client doesn't exist, create it
    INSERT INTO clients (id, email, pw_hash, role)
    VALUES (client_user_id, 'client@example.com', crypt('Client123!', gen_salt('bf')), 'client')
    ON CONFLICT (email) DO UPDATE SET id = client_user_id;
  END IF;
END $$;