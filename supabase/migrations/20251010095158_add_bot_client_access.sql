/*
  # Add Bot Client Access Table

  ## Overview
  Creates a table to manage which clients have access to which bots for demo purposes.

  ## New Tables
  1. **bot_client_access** - Links clients to bots for demo access
     - `id` (uuid, primary key)
     - `bot_id` (uuid) - References bots(id)
     - `client_id` (uuid) - References clients(id)
     - `created_at` (timestamptz)

  ## Security
  - RLS enabled on bot_client_access table
  - Admins can view, insert, and delete access records
  - Clients can view their own access records

  ## Important Notes
  - Unique constraint ensures a client can only be added once per bot
  - Foreign keys ensure referential integrity
  - Cascade deletes when bot or client is deleted
*/

-- Create bot_client_access table
CREATE TABLE IF NOT EXISTS bot_client_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bot_id, client_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bot_client_access_bot ON bot_client_access(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_client_access_client ON bot_client_access(client_id);

-- Enable Row Level Security
ALTER TABLE bot_client_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bot_client_access table
CREATE POLICY "Admins can view all bot client access"
  ON bot_client_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view own bot access"
  ON bot_client_access FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Admins can insert bot client access"
  ON bot_client_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete bot client access"
  ON bot_client_access FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );