/*
  # Fix get_conversation_messages function

  1. Changes
    - Fix ambiguous column reference for 'role' in get_conversation_messages function
    - Qualify column names with table names to avoid ambiguity
*/

-- Drop and recreate the function with the fix
DROP FUNCTION IF EXISTS get_conversation_messages(uuid, uuid);

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
  -- Check if user is admin (qualify with table name)
  SELECT clients.role = 'admin' INTO is_admin
  FROM clients
  WHERE clients.id = p_user_id;

  -- Get bot_id for this session
  SELECT s.bot_id INTO v_bot_id
  FROM sessions s
  WHERE s.id = p_session_id;

  -- Check if user has access to this bot
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
GRANT EXECUTE ON FUNCTION get_conversation_messages(uuid, uuid) TO authenticated;
