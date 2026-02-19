/*
  # Add ip_address to get_bot_conversations function

  1. Changes
    - Drop and recreate `get_bot_conversations` to add ip_address column
*/

DROP FUNCTION IF EXISTS get_bot_conversations(uuid, uuid, integer, integer);

CREATE FUNCTION get_bot_conversations(p_bot_id uuid, p_user_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
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
