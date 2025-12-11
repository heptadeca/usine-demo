/*
  # Update dashboard stats for 4 metrics display

  1. Changes
    - Modify get_dashboard_stats function to return only needed metrics
    - Add active_bots_today: list of bot names used today
    - Keep conversations_today, active_bots (count), and messages_today
*/

-- Drop and recreate the function with updated metrics
DROP FUNCTION IF EXISTS get_dashboard_stats(uuid);

CREATE OR REPLACE FUNCTION get_dashboard_stats(user_id uuid)
RETURNS TABLE (
  conversations_today bigint,
  active_bots bigint,
  messages_today bigint,
  active_bots_today text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT clients.role = 'admin' INTO is_admin
  FROM clients
  WHERE clients.id = user_id;

  IF is_admin THEN
    -- Admin sees all stats
    RETURN QUERY
    SELECT
      -- Conversations today
      COUNT(DISTINCT s.id)::bigint AS conversations_today,
      -- Active bots (bots with activity in last 7 days)
      COUNT(DISTINCT CASE 
        WHEN s.created_at >= NOW() - INTERVAL '7 days' 
        THEN s.bot_id 
      END)::bigint AS active_bots,
      -- Messages today
      COUNT(m.id)::bigint AS messages_today,
      -- Names of bots used today
      ARRAY_AGG(DISTINCT b.name) FILTER (WHERE s.created_at >= CURRENT_DATE)::text[] AS active_bots_today
    FROM sessions s
    LEFT JOIN messages m ON m.session_id = s.id AND m.created_at >= CURRENT_DATE
    LEFT JOIN bots b ON b.id = s.bot_id
    WHERE s.created_at >= CURRENT_DATE;
  ELSE
    -- Client sees only their bots' stats
    RETURN QUERY
    SELECT
      -- Conversations today
      COUNT(DISTINCT s.id)::bigint AS conversations_today,
      -- Active bots (bots with activity in last 7 days)
      COUNT(DISTINCT CASE 
        WHEN s.created_at >= NOW() - INTERVAL '7 days' 
        THEN s.bot_id 
      END)::bigint AS active_bots,
      -- Messages today
      COUNT(m.id)::bigint AS messages_today,
      -- Names of bots used today
      ARRAY_AGG(DISTINCT b.name) FILTER (WHERE s.created_at >= CURRENT_DATE)::text[] AS active_bots_today
    FROM sessions s
    LEFT JOIN messages m ON m.session_id = s.id AND m.created_at >= CURRENT_DATE
    LEFT JOIN bots b ON b.id = s.bot_id
    WHERE s.created_at >= CURRENT_DATE
    AND b.owner_client_id = user_id;
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats(uuid) TO authenticated;
