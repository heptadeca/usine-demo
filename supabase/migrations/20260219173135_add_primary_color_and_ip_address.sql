/*
  # Add primary_color to bots and ip_address to sessions

  1. Changes
    - `bots` table: add `primary_color` column (text, default '#8eb4e3')
    - `sessions` table: add `ip_address` column (text, nullable)

  2. Notes
    - primary_color allows per-bot color customization of the chat widget
    - ip_address tracks the visitor IP for conversation history differentiation
*/

ALTER TABLE bots ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#8eb4e3';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address text;
