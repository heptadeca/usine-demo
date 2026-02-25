-- Add n8n_delete_url column to bots table
ALTER TABLE bots ADD COLUMN IF NOT EXISTS n8n_delete_url TEXT;

-- Update the view or functions if necessary (none found that use * and need specific updates for this column)
