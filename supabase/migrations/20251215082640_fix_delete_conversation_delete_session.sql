/*
  # Fix delete conversation to also delete session

  1. Changes
    - Delete messages first (due to foreign key)
    - Then delete the session itself
    - This ensures the conversation is completely removed
  
  2. Security
    - Maintains admin and ownership checks
*/

CREATE OR REPLACE FUNCTION delete_conversation(
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
  -- Check if user is admin
  SELECT role = 'admin' INTO v_is_admin
  FROM clients
  WHERE id = p_user_id;

  -- Get the bot_id from the session
  SELECT bot_id INTO v_bot_id
  FROM sessions
  WHERE id = p_session_id;

  IF v_bot_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Admin can delete any conversation
  IF v_is_admin THEN
    -- Delete messages first (foreign key constraint)
    DELETE FROM messages WHERE session_id = p_session_id;
    -- Then delete the session
    DELETE FROM sessions WHERE id = p_session_id;
    RETURN true;
  END IF;

  -- For non-admin, check if user owns the bot
  SELECT EXISTS (
    SELECT 1 FROM bots
    WHERE id = v_bot_id
    AND owner_client_id = p_user_id
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Delete messages first (foreign key constraint)
  DELETE FROM messages WHERE session_id = p_session_id;
  -- Then delete the session
  DELETE FROM sessions WHERE id = p_session_id;

  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_conversation(uuid, uuid) TO authenticated;