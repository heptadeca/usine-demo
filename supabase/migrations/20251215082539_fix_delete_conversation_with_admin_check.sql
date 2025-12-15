/*
  # Fix delete conversation function with admin support

  1. Changes
    - Add admin role check to allow admins to delete any conversation
    - Verify client ownership for non-admin users
    - Proper error handling with exceptions instead of boolean returns
  
  2. Security
    - Admins can delete any conversation
    - Regular users can only delete conversations from their own bots
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
    DELETE FROM messages WHERE session_id = p_session_id;
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

  -- Delete all messages for this conversation
  DELETE FROM messages
  WHERE session_id = p_session_id;

  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_conversation(uuid, uuid) TO authenticated;