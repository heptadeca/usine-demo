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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== Début de l\'ingestion ===');

    const { datasourceId } = await req.json();

    console.log('datasourceId reçu:', datasourceId);

    if (!datasourceId) {
      console.error('datasourceId manquant');
      return new Response(
        JSON.stringify({ error: 'datasourceId est requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: datasource, error: dsError } = await supabase
      .from('datasources')
      .select('*, bots(n8n_ingest_url, api_key)')
      .eq('id', datasourceId)
      .maybeSingle();

    if (dsError || !datasource) {
      console.error('Source de données introuvable:', dsError);
      return new Response(
        JSON.stringify({ error: 'Source de données introuvable', details: dsError }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Source de données trouvée:', datasource.id);
    console.log('Bot associé:', datasource.bot_id);

    const webhookUrl = (datasource.bots as any)?.n8n_ingest_url;

    if (!webhookUrl) {
      console.error('URL du webhook du bot non configurée');
      await supabase
        .from('datasources')
        .update({ status: 'error' })
        .eq('id', datasourceId);

      return new Response(
        JSON.stringify({ error: 'URL du webhook n8n non configurée pour ce bot. Vérifiez la configuration du bot.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Webhook URL:', webhookUrl);
    console.log('Type de source:', datasource.type);
    console.log('URL de la source:', datasource.url_or_path);

    let webhookResponse;

    if (datasource.type === 'text') {
      const payload = {
        datasource_id: datasource.id,
        bot_id: datasource.bot_id,
        bot_api_key: (datasource.bots as any)?.api_key,
        type: datasource.type,
        source_filename: datasource.source_filename,
        content: datasource.url_or_path,
        created_at: datasource.created_at,
      };

      webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } else if (datasource.type === 'url') {
      const payload = {
        datasource_id: datasource.id,
        bot_id: datasource.bot_id,
        bot_api_key: (datasource.bots as any)?.api_key,
        type: datasource.type,
        source_filename: datasource.source_filename,
        url: datasource.url_or_path,
        created_at: datasource.created_at,
      };

      webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } else {
      if (!datasource.url_or_path.startsWith('http')) {
        console.error('Invalid file URL:', datasource.url_or_path);
        await supabase
          .from('datasources')
          .update({ status: 'error' })
          .eq('id', datasourceId);

        return new Response(
          JSON.stringify({ error: 'Invalid file URL - file not stored in Supabase Storage' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const fileResponse = await fetch(datasource.url_or_path);

      if (!fileResponse.ok) {
        console.error('Failed to fetch file:', fileResponse.statusText);
        await supabase
          .from('datasources')
          .update({ status: 'error' })
          .eq('id', datasourceId);

        return new Response(
          JSON.stringify({ error: 'Failed to fetch file from storage' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const fileBlob = await fileResponse.blob();
      
      const formData = new FormData();
      formData.append('file', fileBlob, datasource.source_filename);
      formData.append('datasource_id', datasource.id);
      formData.append('bot_id', datasource.bot_id);
      formData.append('bot_api_key', (datasource.bots as any)?.api_key || '');
      formData.append('type', datasource.type);
      formData.append('source_filename', datasource.source_filename);
      formData.append('created_at', datasource.created_at);

      console.log('Envoi du fichier au webhook n8n...');

      webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('Réponse du webhook:', webhookResponse.status);
    }

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Échec du webhook:', webhookResponse.status, errorText);
      await supabase
        .from('datasources')
        .update({ status: 'error' })
        .eq('id', datasourceId);

      return new Response(
        JSON.stringify({
          error: 'Échec de l\'envoi au webhook n8n',
          details: errorText,
          webhookStatus: webhookResponse.status,
          webhookUrl: webhookUrl
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Webhook réussi:', webhookResponse.status);

    await supabase
      .from('datasources')
      .update({ status: 'indexed' })
      .eq('id', datasourceId);

    console.log('Statut mis à jour: indexed');

    await supabase
      .from('events')
      .insert({
        bot_id: datasource.bot_id,
        type: 'datasource_ingested',
        payload_json: { datasource_id: datasourceId },
      });

    console.log('=== Ingestion terminée avec succès ===');

    return new Response(
      JSON.stringify({ success: true, datasource_id: datasourceId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur', details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});