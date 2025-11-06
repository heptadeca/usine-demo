import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Client = {
  id: string;
  email: string;
  role: 'admin' | 'client';
  created_at?: string;
};

export type Bot = {
  id: string;
  name: string;
  owner_client_id: string | null;
  status: 'draft' | 'ready';
  api_key: string;
  prompt: string | null;
  n8n_ingest_url: string;
  n8n_chat_url: string;
  created_at: string;
};

export type Datasource = {
  id: string;
  bot_id: string;
  type: 'text' | 'csv' | 'url' | 'pdf';
  source_filename: string;
  url_or_path: string;
  processed_path: string | null;
  content_hash: string;
  status: 'new' | 'indexed' | 'error';
  created_at: string;
};

export type Session = {
  id: string;
  bot_id: string;
  client_id: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  latency_ms: number | null;
  created_at: string;
};

export type Event = {
  id: string;
  bot_id: string;
  type: string;
  payload_json: Record<string, any> | null;
  created_at: string;
};

export type BotClientAccess = {
  id: string;
  bot_id: string;
  client_id: string;
  created_at: string;
};
