import { supabase } from '../lib/supabase';

export interface DashboardStats {
  conversations_today: number;
  active_bots: number;
  messages_today: number;
  active_bots_today: string[];
}

export interface Conversation {
  session_id: string;
  created_at: string;
  message_count: number;
  last_message_at: string;
  first_message_preview: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  latency_ms: number | null;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    user_id: user.id
  });

  if (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }

  // The function returns an array with a single row, so we need to get the first element
  const result = Array.isArray(data) ? data[0] : data;

  return result as DashboardStats;
}

export async function getBotConversations(
  botId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Conversation[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase.rpc('get_bot_conversations', {
    p_bot_id: botId,
    p_user_id: user.id,
    p_limit: limit,
    p_offset: offset
  });

  if (error) {
    console.error('Error fetching bot conversations:', error);
    throw error;
  }

  return data as Conversation[];
}

export async function getConversationMessages(sessionId: string): Promise<Message[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase.rpc('get_conversation_messages', {
    p_session_id: sessionId,
    p_user_id: user.id
  });

  if (error) {
    console.error('Error fetching conversation messages:', error);
    throw error;
  }

  return data as Message[];
}
