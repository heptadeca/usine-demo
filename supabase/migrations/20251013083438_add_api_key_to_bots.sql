/*
  # Add API Key to Bots Table

  1. Changes
    - Add `api_key` column to `bots` table
    - Generate unique API keys for existing bots
    - Set NOT NULL constraint after populating existing rows

  2. Security
    - API keys are used for external access authentication
*/

ALTER TABLE bots ADD COLUMN IF NOT EXISTS api_key text;

UPDATE bots 
SET api_key = 'bot_' || encode(gen_random_bytes(32), 'hex')
WHERE api_key IS NULL;

ALTER TABLE bots ALTER COLUMN api_key SET NOT NULL;
ALTER TABLE bots ADD CONSTRAINT bots_api_key_unique UNIQUE (api_key);