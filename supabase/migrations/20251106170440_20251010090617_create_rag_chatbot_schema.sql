/*
  # RAG Chatbot Demo Platform Schema

  ## Overview
  Complete database schema for a RAG chatbot demo platform with multi-tenant support.
  Integrates with n8n webhooks for AI processing and vector storage.

  ## Tables Created
  
  1. **clients** - User accounts (admin and client roles)
     - `id` (uuid, primary key)
     - `email` (text, unique) - User email for login
     - `pw_hash` (text) - Hashed password
     - `role` (text) - Either 'admin' or 'client'
     - `created_at` (timestamptz) - Account creation timestamp

  2. **bots** - Chatbot instances
     - `id` (uuid, primary key)
     - `name` (text) - Bot display name
     - `owner_client_id` (uuid, nullable) - References clients(id)
     - `status` (text) - 'draft' or 'ready'
     - `n8n_ingest_url` (text) - Webhook URL for data ingestion
     - `n8n_chat_url` (text) - Webhook URL for chat requests
     - `created_at` (timestamptz)

  3. **datasources** - Knowledge base sources for bots
     - `id` (uuid, primary key)
     - `bot_id` (uuid) - References bots(id)
     - `type` (text) - 'text', 'csv', 'url', or 'pdf'
     - `source_filename` (text) - Original filename or identifier
     - `url_or_path` (text) - Storage path or URL
     - `processed_path` (text, nullable) - Path to processed data
     - `content_hash` (text) - SHA1 hash for deduplication
     - `status` (text) - 'new', 'indexed', or 'error'
     - `created_at` (timestamptz)

  4. **sessions** - Chat sessions
     - `id` (uuid, primary key)
     - `bot_id` (uuid) - References bots(id)
     - `client_id` (uuid, nullable) - References clients(id)
     - `created_at` (timestamptz)

  5. **messages** - Chat message history
     - `id` (uuid, primary key)
     - `session_id` (uuid) - References sessions(id)
     - `role` (text) - 'user', 'assistant', or 'system'
     - `content` (text) - Message content
     - `latency_ms` (integer, nullable) - Response time in milliseconds
     - `created_at` (timestamptz)

  6. **events** - Audit log for bot operations
     - `id` (uuid, primary key)
     - `bot_id` (uuid) - References bots(id)
     - `type` (text) - Event type identifier
     - `payload_json` (jsonb) - Event metadata
     - `created_at` (timestamptz)

  ## Security
  
  - RLS enabled on all tables
  - Admin role: full access to all data
  - Client role: restricted to own bots and related resources
  - Public access: none by default

  ## Important Notes
  
  1. All tables use RLS for data isolation
  2. Foreign keys ensure referential integrity
  3. Indexes added for common query patterns
  4. Status fields use CHECK constraints for data validation
  5. Timestamps default to current time for audit trail
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  pw_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'client')),
  created_at timestamptz DEFAULT now()
);

-- Create bots table
CREATE TABLE IF NOT EXISTS bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready')),
  n8n_ingest_url text NOT NULL,
  n8n_chat_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create datasources table
CREATE TABLE IF NOT EXISTS datasources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('text', 'csv', 'url', 'pdf')),
  source_filename text NOT NULL,
  url_or_path text NOT NULL,
  processed_path text,
  content_hash text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'indexed', 'error')),
  created_at timestamptz DEFAULT now()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bots_owner ON bots(owner_client_id);
CREATE INDEX IF NOT EXISTS idx_datasources_bot ON datasources(bot_id);
CREATE INDEX IF NOT EXISTS idx_datasources_hash ON datasources(bot_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_bot ON sessions(bot_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_events_bot ON events(bot_id);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasources ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients table
CREATE POLICY "Admins can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view own profile"
  ON clients FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Clients can update own profile"
  ON clients FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for bots table
CREATE POLICY "Admins can view all bots"
  ON bots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view own bots"
  ON bots FOR SELECT
  TO authenticated
  USING (owner_client_id = auth.uid());

CREATE POLICY "Admins can insert bots"
  ON bots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all bots"
  ON bots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can update own bots"
  ON bots FOR UPDATE
  TO authenticated
  USING (owner_client_id = auth.uid())
  WITH CHECK (owner_client_id = auth.uid());

-- RLS Policies for datasources table
CREATE POLICY "Admins can view all datasources"
  ON datasources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view own bot datasources"
  ON datasources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bots 
      WHERE bots.id = datasources.bot_id 
      AND bots.owner_client_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert datasources"
  ON datasources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update datasources"
  ON datasources FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete datasources"
  ON datasources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for sessions table
CREATE POLICY "Admins can view all sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Anyone can insert sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for messages table
CREATE POLICY "Admins can view all messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view own session messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.client_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for events table
CREATE POLICY "Admins can view all events"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view own bot events"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bots 
      WHERE bots.id = events.bot_id 
      AND bots.owner_client_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );