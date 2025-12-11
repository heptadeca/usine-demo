/*
  # Add delete conversation function

  1. New Functions
    - `delete_conversation(p_session_id text, p_user_id uuid)` - Deletes all messages for a conversation
      - Verifies user owns the bot associated with the conversation
      - Returns boolean indicating success
  
  2. Security
    - Function checks ownership before deletion
    - Only deletes messages if user has access to the bot
*/

CREATE OR REPLACE FUNCTION delete_conversation(
  p_session_id text,
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
  -- Get the bot_id from the first message in the conversation
  SELECT bot_id INTO v_bot_id
  FROM messages
  WHERE session_id = p_session_id
  LIMIT 1;

  IF v_bot_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user has access to this bot
  SELECT EXISTS (
    SELECT 1 FROM bots
    WHERE id = v_bot_id
    AND user_id = p_user_id
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