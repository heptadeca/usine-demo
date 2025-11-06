/*
  # Setup Default Admin Account

  1. Changes
    - Remove unused pw_hash column from clients table
    - Remove unused admin_key column from clients table
    - Create default admin account (admin@demo.com)
    - Ensure clean authentication flow using only Supabase Auth

  2. Security
    - Default admin is created with secure password
    - RLS policies already in place
    - Single source of truth: Supabase Auth + clients table for roles

  3. Auto-setup
    - On fresh deployment, admin account is automatically created
    - Idempotent: safe to run multiple times
*/

-- Remove unused columns from clients table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'pw_hash'
  ) THEN
    ALTER TABLE clients DROP COLUMN pw_hash;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'admin_key'
  ) THEN
    ALTER TABLE clients DROP COLUMN admin_key;
  END IF;
END $$;

-- Create function to setup default admin (idempotent)
CREATE OR REPLACE FUNCTION setup_default_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  admin_exists boolean;
BEGIN
  -- Check if admin already exists in auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = 'admin@demo.com'
  ) INTO admin_exists;

  -- Only create if doesn't exist
  IF NOT admin_exists THEN
    -- Create user in auth.users
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
      'admin@demo.com',
      crypt('Adm1n$ecur3!2025', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"],"role":"admin"}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO admin_user_id;

    -- Insert into clients table (trigger will handle this, but we ensure it)
    INSERT INTO public.clients (id, email, role)
    VALUES (admin_user_id, 'admin@demo.com', 'admin')
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin', email = 'admin@demo.com';

    RAISE NOTICE 'Default admin account created: admin@demo.com / Adm1n$ecur3!2025';
  ELSE
    RAISE NOTICE 'Default admin account already exists';
  END IF;
END;
$$;

-- Execute the setup function
SELECT setup_default_admin();

-- Update trigger to remove admin_key handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.clients (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = COALESCE(NEW.raw_app_meta_data->>'role', clients.role);
  
  RETURN NEW;
END;
$$;
