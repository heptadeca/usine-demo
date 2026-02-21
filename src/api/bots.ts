import { supabase } from '../lib/supabase';
import { createBotSchema, updateBotSchema } from '../lib/validation';
import type { Bot } from '../lib/supabase';

const N8N_INGEST_URL = import.meta.env.VITE_N8N_INGEST_URL as string;
const N8N_CHAT_URL = import.meta.env.VITE_N8N_CHAT_URL as string;

export async function listBots(clientId: string, role: string): Promise<Bot[]> {
  let query = supabase.from('bots').select('*').order('created_at', { ascending: false });

  if (role === 'client') {
    query = query.eq('owner_client_id', clientId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to fetch bots');
  }

  return data || [];
}

export async function getBot(botId: string, clientId: string, role: string) {
  const { data: bot, error } = await supabase
    .from('bots')
    .select('*')
    .eq('id', botId)
    .maybeSingle();

  if (error || !bot) {
    throw new Error('Bot not found');
  }

  if (role !== 'admin' && bot.owner_client_id !== clientId) {
    throw new Error('Unauthorized');
  }

  const { count: datasourceCount } = await supabase
    .from('datasources')
    .select('*', { count: 'exact', head: true })
    .eq('bot_id', botId);

  const { data: lastEvent } = await supabase
    .from('events')
    .select('*')
    .eq('bot_id', botId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ...bot,
    datasource_count: datasourceCount || 0,
    last_event: lastEvent,
  };
}

export async function createBot(name: string, ownerId: string | null) {
  const validation = createBotSchema.safeParse({ name });
  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const { data, error } = await supabase
    .from('bots')
    .insert({
      name,
      owner_client_id: ownerId,
      status: 'draft',
      n8n_ingest_url: N8N_INGEST_URL,
      n8n_chat_url: N8N_CHAT_URL,
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create bot');
  }

  return data;
}

export async function updateBot(botId: string, updates: { name?: string }, clientId: string, role: string) {
  const validation = updateBotSchema.safeParse(updates);
  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const { data: bot } = await supabase
    .from('bots')
    .select('owner_client_id')
    .eq('id', botId)
    .maybeSingle();

  if (!bot) {
    throw new Error('Bot not found');
  }

  if (role !== 'admin' && bot.owner_client_id !== clientId) {
    throw new Error('Unauthorized');
  }

  const { data, error } = await supabase
    .from('bots')
    .update(updates)
    .eq('id', botId)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update bot');
  }

  return data;
}
