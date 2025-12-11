/*
  # Add Conversation Analytics Functions

  1. Changes
    - Add indexes for better query performance
    - Create function to get dashboard statistics
    - Create function to get conversation details
    - Update RLS if needed

  2. Analytics Support
    - Dashboard stats: active bots, messages today, total conversations
    - Per-bot conversation history
    - Message timeline
*/

-- Add indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_sessions_bot_id ON sessions(bot_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats jsonb;
  is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT role = 'admin' INTO is_admin
  FROM clients
  WHERE id = user_id;

  -- Calculate stats based on user role
  IF is_admin THEN
    -- Admin sees all bots stats
    SELECT jsonb_build_object(
      'total_bots', (SELECT COUNT(*) FROM bots),
      'active_bots', (
        SELECT COUNT(DISTINCT s.bot_id)
        FROM sessions s
        WHERE s.created_at > now() - interval '7 days'
      ),
      'total_conversations', (SELECT COUNT(*) FROM sessions),
      'conversations_today', (
        SELECT COUNT(*)
        FROM sessions
        WHERE created_at::date = CURRENT_DATE
      ),
      'total_messages', (SELECT COUNT(*) FROM messages),
      'messages_today', (
        SELECT COUNT(*)
        FROM messages
        WHERE created_at::date = CURRENT_DATE
      )
    ) INTO stats;
  ELSE
    -- Client sees only their bots stats
    SELECT jsonb_build_object(
      'total_bots', (
        SELECT COUNT(*)
        FROM bots
        WHERE owner_client_id = user_id
      ),
      'active_bots', (
        SELECT COUNT(DISTINCT s.bot_id)
        FROM sessions s
        JOIN bots b ON b.id = s.bot_id
        WHERE b.owner_client_id = user_id
        AND s.created_at > now() - interval '7 days'
      ),
      'total_conversations', (
        SELECT COUNT(*)
        FROM sessions s
        JOIN bots b ON b.id = s.bot_id
        WHERE b.owner_client_id = user_id
      ),
      'conversations_today', (
        SELECT COUNT(*)
        FROM sessions s
        JOIN bots b ON b.id = s.bot_id
        WHERE b.owner_client_id = user_id
        AND s.created_at::date = CURRENT_DATE
      ),
      'total_messages', (
        SELECT COUNT(*)
        FROM messages m
        JOIN sessions s ON s.id = m.session_id
        JOIN bots b ON b.id = s.bot_id
        WHERE b.owner_client_id = user_id
      ),
      'messages_today', (
        SELECT COUNT(*)
        FROM messages m
        JOIN sessions s ON s.id = m.session_id
        JOIN bots b ON b.id = s.bot_id
        WHERE b.owner_client_id = user_id
        AND m.created_at::date = CURRENT_DATE
      )
    ) INTO stats;
  END IF;

  RETURN stats;
END;
$$;

-- Function to get conversations for a bot
CREATE OR REPLACE FUNCTION get_bot_conversations(p_bot_id uuid, p_user_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE (
  session_id uuid,
  created_at timestamptz,
  message_count bigint,
  last_message_at timestamptz,
  first_message_preview text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  has_access boolean;
BEGIN
  -- Check if user is admin
  SELECT role = 'admin' INTO is_admin
  FROM clients
  WHERE id = p_user_id;

  -- Check if user has access to this bot
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

  -- Return conversation data
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
    ) as first_message_preview
  FROM sessions s
  LEFT JOIN messages m ON m.session_id = s.id
  WHERE s.bot_id = p_bot_id
  GROUP BY s.id, s.created_at
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get messages for a conversation
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
  -- Check if user is admin
  SELECT role = 'admin' INTO is_admin
  FROM clients
  WHERE id = p_user_id;

  -- Get bot_id for this session
  SELECT s.bot_id INTO v_bot_id
  FROM sessions s
  WHERE s.id = p_session_id;

  -- Check if user has access to this bot
  IF NOT is_admin THEN
    SELECT EXISTS(
      SELECT 1 FROM bots
      WHERE bots.id = v_bot_id
      AND owner_client_id = p_user_id
    ) INTO has_access;

    IF NOT has_access THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;

  -- Return messages
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_bot_conversations(uuid, uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_messages(uuid, uuid) TO authenticated;
