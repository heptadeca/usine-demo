/*
  # Update RLS Policies for Client Bot Access

  ## Overview
  Updates RLS policies to allow clients to access bots through the bot_client_access table.

  ## Changes
  1. **Bots table** - Add policy for clients to view bots they have access to
  2. **Datasources table** - Add policy for clients to view datasources of accessible bots
  3. **Sessions table** - Add policy for clients to view sessions of accessible bots
  4. **Messages table** - Add policy for clients to view messages of accessible bot sessions
  5. **Events table** - Add policy for clients to view events of accessible bots

  ## Security
  - Clients can only access resources for bots they have explicit access to via bot_client_access
  - All policies check authentication
  - Maintains data isolation between clients

  ## Important Notes
  - These policies work in conjunction with existing owner-based policies
  - Clients can access bots either as owner or through bot_client_access
*/

-- Add policy for clients to view bots they have access to
CREATE POLICY "Clients can view accessible bots"
  ON bots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bot_client_access
      WHERE bot_client_access.bot_id = bots.id
      AND bot_client_access.client_id = auth.uid()
    )
  );

-- Add policy for clients to view datasources of accessible bots
CREATE POLICY "Clients can view accessible bot datasources"
  ON datasources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bot_client_access
      WHERE bot_client_access.bot_id = datasources.bot_id
      AND bot_client_access.client_id = auth.uid()
    )
  );

-- Add policy for clients to view sessions of accessible bots
CREATE POLICY "Clients can view accessible bot sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bot_client_access
      WHERE bot_client_access.bot_id = sessions.bot_id
      AND bot_client_access.client_id = auth.uid()
    )
  );

-- Add policy for clients to view messages of accessible bot sessions
CREATE POLICY "Clients can view accessible bot messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      JOIN bot_client_access ON bot_client_access.bot_id = sessions.bot_id
      WHERE sessions.id = messages.session_id
      AND bot_client_access.client_id = auth.uid()
    )
  );

-- Add policy for clients to view events of accessible bots
CREATE POLICY "Clients can view accessible bot events"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bot_client_access
      WHERE bot_client_access.bot_id = events.bot_id
      AND bot_client_access.client_id = auth.uid()
    )
  );