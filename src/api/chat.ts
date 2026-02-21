import { supabase } from '../lib/supabase';
import { createSessionSchema, chatMessageSchema } from '../lib/validation';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit = 60, windowMs = 5 * 60 * 1000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

export async function createSession(botId: string, clientId: string | null) {
  const validation = createSessionSchema.safeParse({ bot_id: botId });
  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const { data: bot } = await supabase
    .from('bots')
    .select('id')
    .eq('id', botId)
    .maybeSingle();

  if (!bot) {
    throw new Error('Bot not found');
  }

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      bot_id: botId,
      client_id: clientId,
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create session');
  }

  return session;
}

export async function sendChatMessage(
  botId: string,
  sessionId: string,
  message: string,
  ipAddress: string
) {
  const validation = chatMessageSchema.safeParse({ bot_id: botId, session_id: sessionId, message });
  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const rateLimitKey = `${ipAddress}-${sessionId}`;
  if (!checkRateLimit(rateLimitKey)) {
    throw new Error('Rate limit exceeded. Please wait before sending more messages.');
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('bot_id')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session || session.bot_id !== botId) {
    throw new Error('Invalid session');
  }

  const { data: bot } = await supabase
    .from('bots')
    .select('n8n_chat_url, prompt')
    .eq('id', botId)
    .maybeSingle();

  if (!bot) {
    throw new Error('Bot not found');
  }

  await supabase.from('messages').insert({
    session_id: sessionId,
    role: 'user',
    content: message,
  });

  const startTime = Date.now();

  try {
    const chatUrl = bot.n8n_chat_url || (import.meta.env.VITE_N8N_CHAT_URL as string);
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bot_id: botId,
        session_id: sessionId,
        message,
        prompt: bot.prompt || '',
        k: 8,
        temperature: 0.2,
        max_tokens: 350,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response from chat service');
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    await supabase.from('messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: data.answer || 'No response',
      latency_ms: latencyMs,
    });

    return {
      answer: data.answer,
      sources: data.sources,
      latency_ms: latencyMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process message';

    await supabase.from('messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: `Error: ${errorMessage}`,
      latency_ms: Date.now() - startTime,
    });

    throw new Error(errorMessage);
  }
}

export async function getSessionMessages(sessionId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('Failed to fetch messages');
  }

  return data || [];
}
