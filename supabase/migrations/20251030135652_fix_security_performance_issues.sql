/*
  # Fix Security and Performance Issues

  ## Summary
  This migration addresses critical security and performance issues identified in the database audit:
  - Enables RLS on tables that have policies but RLS disabled
  - Adds missing indexes for foreign keys
  - Optimizes RLS policies to use subqueries for auth functions
  - Removes unused indexes that are never queried

  ## Changes Made

  ### 1. Enable RLS on Tables
  - Enable RLS on `bots`, `clients`, and `datasources` tables that had policies but RLS disabled

  ### 2. Add Missing Index
  - Add index on `sessions.client_id` foreign key for query performance

  ### 3. Optimize RLS Policies
  All policies updated to use `(select auth.uid())` instead of `auth.uid()` directly.
  This prevents the auth function from being re-evaluated for each row, significantly improving performance at scale.
  
  Tables optimized:
  - sessions (3 policies)
  - messages (3 policies)
  - events (4 policies)
  - bot_client_access (4 policies)
  - bots (multiple policies)
  - clients (3 policies)
  - datasources (multiple policies)

  ### 4. Remove Unused Indexes
  - Drop `idx_bots_owner` (never used)
  - Drop `idx_datasources_bot` (never used)

  ## Security Impact
  - All tables now properly enforce RLS
  - Query performance significantly improved through optimized auth checks
  - Foreign key lookups optimized with proper indexing
*/

-- Enable RLS on tables that have policies but RLS disabled
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasources ENABLE ROW LEVEL SECURITY;

-- Add missing index on sessions.client_id foreign key
CREATE INDEX IF NOT EXISTS idx_sessions_client ON sessions(client_id);

-- Remove unused indexes
DROP INDEX IF EXISTS idx_bots_owner;
DROP INDEX IF EXISTS idx_datasources_bot;

-- ==========================================
-- OPTIMIZE RLS POLICIES - CLIENTS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can view all clients" ON clients;
CREATE POLICY "Admins can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

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

-- ==========================================
-- OPTIMIZE RLS POLICIES - BOTS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can view all bots" ON bots;
CREATE POLICY "Admins can view all bots"
  ON bots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clients can view own bots" ON bots;
CREATE POLICY "Clients can view own bots"
  ON bots FOR SELECT
  TO authenticated
  USING (owner_client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Clients can view accessible bots" ON bots;
CREATE POLICY "Clients can view accessible bots"
  ON bots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bot_client_access
      WHERE bot_client_access.bot_id = bots.id
      AND bot_client_access.client_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can insert bots" ON bots;
CREATE POLICY "Admins can insert bots"
  ON bots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clients can insert own bots" ON bots;
CREATE POLICY "Clients can insert own bots"
  ON bots FOR INSERT
  TO authenticated
  WITH CHECK (owner_client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can update all bots" ON bots;
CREATE POLICY "Admins can update all bots"
  ON bots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clients can update own bots" ON bots;
CREATE POLICY "Clients can update own bots"
  ON bots FOR UPDATE
  TO authenticated
  USING (owner_client_id = (select auth.uid()))
  WITH CHECK (owner_client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can delete bots" ON bots;
CREATE POLICY "Admins can delete bots"
  ON bots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clients can delete own bots" ON bots;
CREATE POLICY "Clients can delete own bots"
  ON bots FOR DELETE
  TO authenticated
  USING (owner_client_id = (select auth.uid()));

-- ==========================================
-- OPTIMIZE RLS POLICIES - DATASOURCES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can view all datasources" ON datasources;
CREATE POLICY "Admins can view all datasources"
  ON datasources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clients can view own bot datasources" ON datasources;
CREATE POLICY "Clients can view own bot datasources"
  ON datasources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bots 
      WHERE bots.id = datasources.bot_id 
      AND bots.owner_client_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clients can view accessible bot datasources" ON datasources;
CREATE POLICY "Clients can view accessible bot datasources"
  ON datasources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bot_client_access
      WHERE bot_client_access.bot_id = datasources.bot_id
      AND bot_client_access.client_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can insert datasources" ON datasources;
CREATE POLICY "Admins can insert datasources"
  ON datasources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update datasources" ON datasources;
CREATE POLICY "Admins can update datasources"
  ON datasources FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete datasources" ON datasources;
CREATE POLICY "Admins can delete datasources"
  ON datasources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==========================================
-- OPTIMIZE RLS POLICIES - SESSIONS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
CREATE POLICY "Admins can view all sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clients can view own sessions" ON sessions;
CREATE POLICY "Clients can view own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Clients can view accessible bot sessions" ON sessions;
CREATE POLICY "Clients can view accessible bot sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bot_client_access
      WHERE bot_client_access.bot_id = sessions.bot_id
      AND bot_client_access.client_id = (select auth.uid())
    )
  );

-- ==========================================
-- OPTIMIZE RLS POLICIES - MESSAGES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clients can view own session messages" ON messages;
CREATE POLICY "Clients can view own session messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.client_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clients can view accessible bot messages" ON messages;
CREATE POLICY "Clients can view accessible bot messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      JOIN bot_client_access ON bot_client_access.bot_id = sessions.bot_id
      WHERE sessions.id = messages.session_id
      AND bot_client_access.client_id = (select auth.uid())
    )
  );

-- ==========================================
-- OPTIMIZE RLS POLICIES - EVENTS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can view all events" ON events;
CREATE POLICY "Admins can view all events"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clients can view own bot events" ON events;
CREATE POLICY "Clients can view own bot events"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bots 
      WHERE bots.id = events.bot_id 
      AND bots.owner_client_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clients can view accessible bot events" ON events;
CREATE POLICY "Clients can view accessible bot events"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bot_client_access
      WHERE bot_client_access.bot_id = events.bot_id
      AND bot_client_access.client_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can insert events" ON events;
CREATE POLICY "Admins can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==========================================
-- OPTIMIZE RLS POLICIES - BOT_CLIENT_ACCESS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can view all bot client access" ON bot_client_access;
CREATE POLICY "Admins can view all bot client access"
  ON bot_client_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clients can view own bot access" ON bot_client_access;
CREATE POLICY "Clients can view own bot access"
  ON bot_client_access FOR SELECT
  TO authenticated
  USING (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can insert bot client access" ON bot_client_access;
CREATE POLICY "Admins can insert bot client access"
  ON bot_client_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete bot client access" ON bot_client_access;
CREATE POLICY "Admins can delete bot client access"
  ON bot_client_access FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );
