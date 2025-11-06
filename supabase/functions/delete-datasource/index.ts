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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { datasourceId, botId } = await req.json();

    if (!datasourceId || !botId) {
      return new Response(
        JSON.stringify({ error: 'Missing datasourceId or botId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: datasource, error: fetchError } = await supabaseClient
      .from('datasources')
      .select('*')
      .eq('id', datasourceId)
      .eq('bot_id', botId)
      .maybeSingle();

    if (fetchError || !datasource) {
      return new Response(
        JSON.stringify({ error: 'Datasource not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: bot } = await supabaseClient
      .from('bots')
      .select('n8n_ingest_url')
      .eq('id', botId)
      .maybeSingle();

    try {
      const webhookResponse = await fetch('https://n8n.prcz.fr/webhook/lacroix-deletedata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bot_id: botId,
          datasource_id: datasourceId,
          type: datasource.type,
          source_filename: datasource.source_filename,
          url_or_path: datasource.url_or_path,
          content_hash: datasource.content_hash,
          status: datasource.status,
          created_at: datasource.created_at,
          n8n_ingest_url: bot?.n8n_ingest_url,
        }),
      });

      console.log('Webhook sent, status:', webhookResponse.status);
    } catch (webhookError) {
      console.error('Failed to call n8n delete webhook:', webhookError);
    }

    if (datasource.url_or_path.startsWith('bots/')) {
      await supabaseClient.storage
        .from('bots')
        .remove([datasource.url_or_path]);
    }

    const { error: deleteError } = await supabaseClient
      .from('datasources')
      .delete()
      .eq('id', datasourceId);

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: 'Failed to delete datasource' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});