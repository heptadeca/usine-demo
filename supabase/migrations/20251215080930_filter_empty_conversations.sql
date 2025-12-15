/*
  # Filter Empty Conversations

  1. Changes
    - Update `get_bot_conversations` function to exclude conversations with 0 messages
    - Add HAVING clause to filter out empty conversations
  
  2. Behavior
    - Only conversations with at least 1 message will be displayed
    - Improves user experience by hiding empty/abandoned sessions
*/

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

  -- Return conversation data, filtering out empty conversations
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
  HAVING COUNT(m.id) > 0
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;