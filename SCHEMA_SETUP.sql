-- ============================================================
-- SCRIPT DE RECREATION COMPLETE DE LA BASE DE DONNEES
-- Application RAG Chatbot Platform
--
-- Instructions :
-- 1. Creer un nouveau projet Supabase
-- 2. Mettre a jour VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env
-- 3. Executer ce script dans l'editeur SQL de Supabase (SQL Editor)
-- 4. Creer le compte admin via l'Edge Function create-admin
--    ou via le Dashboard Supabase Authentication
-- ============================================================


-- ============================================================
-- SECTION 1 : TABLES
-- ============================================================

-- Table clients (utilisateurs : admin et client)
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'client')),
  created_at timestamptz DEFAULT now()
);

-- Table bots (instances de chatbot)
CREATE TABLE IF NOT EXISTS bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready')),
  n8n_ingest_url text NOT NULL DEFAULT '',
  n8n_chat_url text NOT NULL DEFAULT '',
  api_key text UNIQUE,
  prompt text,
  primary_color text DEFAULT '#8eb4e3',
  created_at timestamptz DEFAULT now()
);

-- Table datasources (sources de connaissance des bots)
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

-- Table sessions (sessions de chat)
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Table messages (historique des messages)
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Table events (journal d'audit des operations)
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table bot_client_access (acces clients aux bots)
CREATE TABLE IF NOT EXISTS bot_client_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bot_id, client_id)
);


-- ============================================================
-- SECTION 2 : INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_datasources_hash ON datasources(bot_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_bot_id ON sessions(bot_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client ON sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_bot ON events(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_client_access_bot ON bot_client_access(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_client_access_client ON bot_client_access(client_id);


-- ============================================================
-- SECTION 3 : ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasources ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_client_access ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 4 : FONCTION SECURISEE is_admin()
-- Evite la recursion infinie dans les policies RLS
-- ============================================================

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


-- ============================================================
-- SECTION 5 : POLICIES RLS - TABLE clients
-- ============================================================

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


-- ============================================================
-- SECTION 6 : POLICIES RLS - TABLE bots
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all bots" ON bots;
CREATE POLICY "Admins can view all bots"
  ON bots FOR SELECT
  TO authenticated
  USING (is_admin());

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

DROP POLICY IF EXISTS "Anonymous users can view bots for chat" ON bots;
CREATE POLICY "Anonymous users can view bots for chat"
  ON bots FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Admins can insert bots" ON bots;
CREATE POLICY "Admins can insert bots"
  ON bots FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Clients can insert own bots" ON bots;
CREATE POLICY "Clients can insert own bots"
  ON bots FOR INSERT
  TO authenticated
  WITH CHECK (owner_client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can update all bots" ON bots;
CREATE POLICY "Admins can update all bots"
  ON bots FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

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
  USING (is_admin());

DROP POLICY IF EXISTS "Clients can delete own bots" ON bots;
CREATE POLICY "Clients can delete own bots"
  ON bots FOR DELETE
  TO authenticated
  USING (owner_client_id = (select auth.uid()));


-- ============================================================
-- SECTION 7 : POLICIES RLS - TABLE datasources
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all datasources" ON datasources;
CREATE POLICY "Admins can view all datasources"
  ON datasources FOR SELECT
  TO authenticated
  USING (is_admin());

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


-- ============================================================
-- SECTION 8 : POLICIES RLS - TABLE sessions
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
CREATE POLICY "Admins can view all sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (is_admin());

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

DROP POLICY IF EXISTS "Anonymous users can create sessions" ON sessions;
CREATE POLICY "Anonymous users can create sessions"
  ON sessions FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anonymous users can view sessions" ON sessions;
CREATE POLICY "Anonymous users can view sessions"
  ON sessions FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert sessions" ON sessions;
CREATE POLICY "Anyone can insert sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ============================================================
-- SECTION 9 : POLICIES RLS - TABLE messages
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages"
  ON messages FOR SELECT
  TO authenticated
  USING (is_admin());

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

DROP POLICY IF EXISTS "Anonymous users can create messages" ON messages;
CREATE POLICY "Anonymous users can create messages"
  ON messages FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anonymous users can view messages" ON messages;
CREATE POLICY "Anonymous users can view messages"
  ON messages FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert messages" ON messages;
CREATE POLICY "Anyone can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ============================================================
-- SECTION 10 : POLICIES RLS - TABLE events
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all events" ON events;
CREATE POLICY "Admins can view all events"
  ON events FOR SELECT
  TO authenticated
  USING (is_admin());

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
  WITH CHECK (is_admin());


-- ============================================================
-- SECTION 11 : POLICIES RLS - TABLE bot_client_access
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all bot client access" ON bot_client_access;
CREATE POLICY "Admins can view all bot client access"
  ON bot_client_access FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Clients can view own bot access" ON bot_client_access;
CREATE POLICY "Clients can view own bot access"
  ON bot_client_access FOR SELECT
  TO authenticated
  USING (client_id = (select auth.uid()));

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


-- ============================================================
-- SECTION 12 : STORAGE BUCKET pour les datasources
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('datasource-files', 'datasource-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload datasource files" ON storage.objects;
CREATE POLICY "Authenticated users can upload datasource files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'datasource-files');

DROP POLICY IF EXISTS "Public can read datasource files" ON storage.objects;
CREATE POLICY "Public can read datasource files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'datasource-files');


-- ============================================================
-- SECTION 13 : TRIGGER - Creation automatique de clients
-- Chaque nouvel utilisateur Supabase Auth obtient une entree
-- dans la table clients avec le role 'client' par defaut
-- ============================================================

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;


-- ============================================================
-- SECTION 14 : TRIGGER - Suppression de auth.users en cascade
-- Quand un client est supprime, son compte auth est aussi supprime
-- ============================================================

CREATE OR REPLACE FUNCTION delete_auth_user_on_client_delete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to delete auth user %: %', OLD.id, SQLERRM;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_delete_auth_user_after_client_delete ON clients;
CREATE TRIGGER trigger_delete_auth_user_after_client_delete
  AFTER DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION delete_auth_user_on_client_delete();

GRANT EXECUTE ON FUNCTION delete_auth_user_on_client_delete() TO authenticated;


-- ============================================================
-- SECTION 15 : FONCTIONS ANALYTIQUES
-- ============================================================

-- Statistiques du tableau de bord
CREATE OR REPLACE FUNCTION get_dashboard_stats(user_id uuid)
RETURNS TABLE (
  conversations_today bigint,
  active_bots bigint,
  messages_today bigint,
  active_bots_today text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT clients.role = 'admin' INTO is_admin
  FROM clients
  WHERE clients.id = user_id;

  IF is_admin THEN
    RETURN QUERY
    SELECT
      COUNT(DISTINCT s.id)::bigint AS conversations_today,
      COUNT(DISTINCT CASE
        WHEN s.created_at >= NOW() - INTERVAL '7 days'
        THEN s.bot_id
      END)::bigint AS active_bots,
      COUNT(m.id)::bigint AS messages_today,
      ARRAY_AGG(DISTINCT b.name) FILTER (WHERE s.created_at >= CURRENT_DATE)::text[] AS active_bots_today
    FROM sessions s
    LEFT JOIN messages m ON m.session_id = s.id AND m.created_at >= CURRENT_DATE
    LEFT JOIN bots b ON b.id = s.bot_id
    WHERE s.created_at >= CURRENT_DATE;
  ELSE
    RETURN QUERY
    SELECT
      COUNT(DISTINCT s.id)::bigint AS conversations_today,
      COUNT(DISTINCT CASE
        WHEN s.created_at >= NOW() - INTERVAL '7 days'
        THEN s.bot_id
      END)::bigint AS active_bots,
      COUNT(m.id)::bigint AS messages_today,
      ARRAY_AGG(DISTINCT b.name) FILTER (WHERE s.created_at >= CURRENT_DATE)::text[] AS active_bots_today
    FROM sessions s
    LEFT JOIN messages m ON m.session_id = s.id AND m.created_at >= CURRENT_DATE
    LEFT JOIN bots b ON b.id = s.bot_id
    WHERE s.created_at >= CURRENT_DATE
    AND b.owner_client_id = user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_stats(uuid) TO authenticated;


-- Liste des conversations d'un bot (avec filtrage des conversations vides)
DROP FUNCTION IF EXISTS get_bot_conversations(uuid, uuid, integer, integer);

CREATE FUNCTION get_bot_conversations(
  p_bot_id uuid,
  p_user_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  session_id uuid,
  created_at timestamptz,
  message_count bigint,
  last_message_at timestamptz,
  first_message_preview text,
  ip_address text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  has_access boolean;
BEGIN
  SELECT role = 'admin' INTO is_admin
  FROM clients
  WHERE id = p_user_id;

  IF NOT is_admin THEN
    SELECT EXISTS(
      SELECT 1 FROM bots
      WHERE id = p_bot_id
      AND owner_client_id = p_user_id
    ) INTO has_access;

    IF NOT has_access THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    s.id as session_id,
    s.created_at,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at,
    (
      SELECT m2.content
      FROM messages m2
      WHERE m2.session_id = s.id
      AND m2.role = 'user'
      ORDER BY m2.created_at ASC
      LIMIT 1
    ) as first_message_preview,
    s.ip_address
  FROM sessions s
  LEFT JOIN messages m ON m.session_id = s.id
  WHERE s.bot_id = p_bot_id
  GROUP BY s.id, s.created_at, s.ip_address
  HAVING COUNT(m.id) > 0
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_bot_conversations(uuid, uuid, integer, integer) TO authenticated;


-- Messages d'une conversation
CREATE OR REPLACE FUNCTION get_conversation_messages(p_session_id uuid, p_user_id uuid)
RETURNS TABLE (
  id uuid,
  role text,
  content text,
  created_at timestamptz,
  latency_ms integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  has_access boolean;
  v_bot_id uuid;
BEGIN
  SELECT clients.role = 'admin' INTO is_admin
  FROM clients
  WHERE clients.id = p_user_id;

  SELECT s.bot_id INTO v_bot_id
  FROM sessions s
  WHERE s.id = p_session_id;

  IF NOT is_admin THEN
    SELECT EXISTS(
      SELECT 1 FROM bots
      WHERE bots.id = v_bot_id
      AND bots.owner_client_id = p_user_id
    ) INTO has_access;

    IF NOT has_access THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.role,
    m.content,
    m.created_at,
    m.latency_ms
  FROM messages m
  WHERE m.session_id = p_session_id
  ORDER BY m.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_conversation_messages(uuid, uuid) TO authenticated;


-- Suppression d'une conversation (messages + session)
DROP FUNCTION IF EXISTS delete_conversation(text, uuid);
DROP FUNCTION IF EXISTS delete_conversation(uuid, uuid);

CREATE FUNCTION delete_conversation(
  p_session_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bot_id uuid;
  v_is_admin boolean;
  v_has_access boolean;
BEGIN
  SELECT role = 'admin' INTO v_is_admin
  FROM clients
  WHERE id = p_user_id;

  SELECT bot_id INTO v_bot_id
  FROM sessions
  WHERE id = p_session_id;

  IF v_bot_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_is_admin THEN
    DELETE FROM messages WHERE session_id = p_session_id;
    DELETE FROM sessions WHERE id = p_session_id;
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM bots
    WHERE id = v_bot_id
    AND owner_client_id = p_user_id
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM messages WHERE session_id = p_session_id;
  DELETE FROM sessions WHERE id = p_session_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_conversation(uuid, uuid) TO authenticated;


-- ============================================================
-- SECTION 16 : CREATION DU COMPTE ADMIN PAR DEFAUT
--
-- Un compte admin est cree automatiquement :
--   Email    : admin@demo.com
--   Mot de passe : Adm1n$ecur3!2025
--
-- IMPORTANT : Changez ce mot de passe apres la premiere connexion.
-- ============================================================

DO $$
DECLARE
  admin_user_id uuid;
  admin_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = 'admin@demo.com'
  ) INTO admin_exists;

  IF NOT admin_exists THEN
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

    INSERT INTO public.clients (id, email, role)
    VALUES (admin_user_id, 'admin@demo.com', 'admin')
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin', email = 'admin@demo.com';

    RAISE NOTICE 'Compte admin cree : admin@demo.com / Adm1n$ecur3!2025';
  ELSE
    RAISE NOTICE 'Le compte admin existe deja.';
  END IF;
END $$;
