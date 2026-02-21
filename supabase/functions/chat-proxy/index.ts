import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const { message, bot_id, session_id, k, temperature, max_tokens } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!bot_id) {
      return new Response(
        JSON.stringify({ error: 'bot_id is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('prompt')
      .eq('id', bot_id)
      .maybeSingle();

    if (botError || !bot) {
      return new Response(
        JSON.stringify({ error: 'Bot not found' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Ensure session exists
    let currentSessionId = session_id;
    if (currentSessionId) {
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', currentSessionId)
        .maybeSingle();

      if (!existingSession) {
        const { data: newSession } = await supabase
          .from('sessions')
          .insert({ id: currentSessionId, bot_id })
          .select('id')
          .maybeSingle();

        currentSessionId = newSession?.id || currentSessionId;
      }
    } else {
      const { data: newSession } = await supabase
        .from('sessions')
        .insert({ bot_id })
        .select('id')
        .maybeSingle();

      currentSessionId = newSession?.id;
    }

    // Log user message
    const startTime = Date.now();
    await supabase
      .from('messages')
      .insert({
        session_id: currentSessionId,
        role: 'user',
        content: message,
      });

    const n8nUrl = Deno.env.get('N8N_CHAT_URL') ?? '';

    const n8nResponse = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        bot_id,
        session_id: currentSessionId,
        prompt: bot.prompt || '',
        k: k || 8,
        temperature: temperature || 0.2,
        max_tokens: max_tokens || 350,
      }),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      return new Response(
        JSON.stringify({ error: `N8N error: ${errorText}` }),
        {
          status: n8nResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const data = await n8nResponse.json();
    const latency = Date.now() - startTime;

    // Log bot response
    if (data.response) {
      await supabase
        .from('messages')
        .insert({
          session_id: currentSessionId,
          role: 'assistant',
          content: data.response,
          latency_ms: latency,
        });
    }

    return new Response(
      JSON.stringify({ ...data, session_id: currentSessionId }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});