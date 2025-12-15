/*
  # Fix delete conversation function

  1. Changes
    - Fix bot_id lookup to use sessions table instead of messages
    - Fix ownership check to use owner_client_id instead of user_id
    - Add proper GRANT permissions
    - Handle UUID parameter type correctly
  
  2. Security
    - Verify user owns the bot before deletion
    - Use SECURITY DEFINER for RLS bypass
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
  v_has_access boolean;
BEGIN
  -- Get the bot_id from the session
  SELECT bot_id INTO v_bot_id
  FROM sessions
  WHERE id = p_session_id;

  IF v_bot_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user has access to this bot
  SELECT EXISTS (
    SELECT 1 FROM bots
    WHERE id = v_bot_id
    AND owner_client_id = p_user_id
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN false;
  END IF;

  -- Delete all messages for this conversation
  DELETE FROM messages
  WHERE session_id = p_session_id;

  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_conversation(uuid, uuid) TO authenticated;