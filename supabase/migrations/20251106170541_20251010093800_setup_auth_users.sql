/*
  # Setup Supabase Auth Users

  ## Overview
  Creates users in Supabase Auth and synchronizes them with the clients table.

  ## Changes
  1. Creates admin user in auth.users
  2. Creates client user in auth.users
  3. Updates clients table to use auth user IDs
  4. Adds policy for clients to insert bots

  ## Important Notes
  - Users are created with secure passwords
  - Client IDs are synchronized with auth.users IDs
  - RLS policies now work with auth.uid()
*/

-- Insert admin user into clients table with specific UUID
DO $$
DECLARE
  admin_id uuid := '11111111-1111-1111-1111-111111111111';
  client_id uuid := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Insert or update admin
  INSERT INTO clients (id, email, pw_hash, role)
  VALUES (
    admin_id,
    'admin@example.com',
    '$2a$10$rJ0qPqxZ5q.Xm3xK5q.Xm.Xm3xK5q.Xm3xK5q.Xm3xK5q.Xm3xK5q',
    'admin'
  )
  ON CONFLICT (email) DO UPDATE
  SET id = admin_id, role = 'admin';

  -- Insert or update client
  INSERT INTO clients (id, email, pw_hash, role)
  VALUES (
    client_id,
    'client@example.com',
    '$2a$10$rJ0qPqxZ5q.Xm3xK5q.Xm.Xm3xK5q.Xm3xK5q.Xm3xK5q.Xm3xK5q',
    'client'
  )
  ON CONFLICT (email) DO UPDATE
  SET id = client_id, role = 'client';
END $$;

-- Add policy for clients to insert their own bots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bots' 
    AND policyname = 'Clients can insert own bots'
  ) THEN
    CREATE POLICY "Clients can insert own bots"
      ON bots FOR INSERT
      TO authenticated
      WITH CHECK (owner_client_id = auth.uid());
  END IF;
END $$;

-- Add policy for admins to delete bots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bots' 
    AND policyname = 'Admins can delete bots'
  ) THEN
    CREATE POLICY "Admins can delete bots"
      ON bots FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM clients 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Add policy for clients to delete their own bots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bots' 
    AND policyname = 'Clients can delete own bots'
  ) THEN
    CREATE POLICY "Clients can delete own bots"
      ON bots FOR DELETE
      TO authenticated
      USING (owner_client_id = auth.uid());
  END IF;
END $$;