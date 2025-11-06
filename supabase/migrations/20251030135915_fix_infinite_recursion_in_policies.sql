/*
  # Fix Infinite Recursion in RLS Policies

  ## Summary
  Fixes infinite recursion error in RLS policies caused by policies checking the same table they protect.
  
  ## Problem
  The policies on clients, bots, datasources, sessions, messages, events, and bot_client_access tables
  check if a user is an admin by querying the clients table. This creates infinite recursion when
  the clients table itself has policies that reference clients.

  ## Solution
  Create a security definer function that bypasses RLS to check if a user is an admin.
  This function runs with elevated privileges and can read from clients without triggering RLS policies.

  ## Changes Made
  1. Create `is_admin()` function with security definer to check admin role
  2. Update all policies to use this function instead of direct table queries
  3. This eliminates the recursive policy checks
*/

-- Create a security definer function to check if current user is admin
-- This function bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clients
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ==========================================
-- UPDATE ALL POLICIES TO USE is_admin()
-- ==========================================

-- CLIENTS TABLE
DROP POLICY IF EXISTS "Admins can view all clients" ON clients;
CREATE POLICY "Admins can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Clients can view own profile" ON clients;
CREATE POLICY "Clients can view own profile"
  ON clients FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Clients can update own profile" ON clients;
CREATE POLICY "Clients can update own profile"
  ON clients FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- BOTS TABLE
DROP POLICY IF EXISTS "Admins can view all bots" ON bots;
CREATE POLICY "Admins can view all bots"
  ON bots FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert bots" ON bots;
CREATE POLICY "Admins can insert bots"
  ON bots FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update all bots" ON bots;
CREATE POLICY "Admins can update all bots"
  ON bots FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete bots" ON bots;
CREATE POLICY "Admins can delete bots"
  ON bots FOR DELETE
  TO authenticated
  USING (is_admin());

-- DATASOURCES TABLE
DROP POLICY IF EXISTS "Admins can view all datasources" ON datasources;
CREATE POLICY "Admins can view all datasources"
  ON datasources FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert datasources" ON datasources;
CREATE POLICY "Admins can insert datasources"
  ON datasources FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update datasources" ON datasources;
CREATE POLICY "Admins can update datasources"
  ON datasources FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete datasources" ON datasources;
CREATE POLICY "Admins can delete datasources"
  ON datasources FOR DELETE
  TO authenticated
  USING (is_admin());

-- SESSIONS TABLE
DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
CREATE POLICY "Admins can view all sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (is_admin());

-- MESSAGES TABLE
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages"
  ON messages FOR SELECT
  TO authenticated
  USING (is_admin());

-- EVENTS TABLE
DROP POLICY IF EXISTS "Admins can view all events" ON events;
CREATE POLICY "Admins can view all events"
  ON events FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert events" ON events;
CREATE POLICY "Admins can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- BOT_CLIENT_ACCESS TABLE
DROP POLICY IF EXISTS "Admins can view all bot client access" ON bot_client_access;
CREATE POLICY "Admins can view all bot client access"
  ON bot_client_access FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert bot client access" ON bot_client_access;
CREATE POLICY "Admins can insert bot client access"
  ON bot_client_access FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete bot client access" ON bot_client_access;
CREATE POLICY "Admins can delete bot client access"
  ON bot_client_access FOR DELETE
  TO authenticated
  USING (is_admin());
