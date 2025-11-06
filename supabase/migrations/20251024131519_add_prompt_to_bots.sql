/*
  # Add prompt field to bots table

  1. Changes
    - Add `prompt` column to `bots` table (text, nullable)
    - This allows admins to configure a custom system prompt for each bot
    - The prompt will be sent to the webhook when chatting with the bot

  2. Notes
    - The prompt is optional (nullable) to maintain backward compatibility
    - Default value can be set at application level
*/

ALTER TABLE bots ADD COLUMN IF NOT EXISTS prompt text;

COMMENT ON COLUMN bots.prompt IS 'Custom system prompt sent to the chat webhook for this bot';
