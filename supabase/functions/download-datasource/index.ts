import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-API-Key',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const datasourceId = url.searchParams.get('datasource_id');
    const apiKey = req.headers.get('X-API-Key');

    if (!datasourceId) {
      return new Response(
        JSON.stringify({ error: 'datasource_id parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'X-API-Key header is required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: datasource, error: dsError } = await supabase
      .from('datasources')
      .select('*, bots(id, name, api_key)')
      .eq('id', datasourceId)
      .maybeSingle();

    if (dsError || !datasource) {
      console.error('Datasource not found:', dsError);
      return new Response(
        JSON.stringify({ error: 'Datasource not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const bot = datasource.bots as any;
    if (!bot?.api_key || bot.api_key !== apiKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (datasource.type === 'text') {
      return new Response(datasource.url_or_path, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${datasource.source_filename}"`,
        },
      });
    }

    if (datasource.type === 'url') {
      return new Response(
        JSON.stringify({
          type: 'url',
          url: datasource.url_or_path,
          source_filename: datasource.source_filename,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!datasource.url_or_path.startsWith('http')) {
      return new Response(
        JSON.stringify({ error: 'File not stored in Supabase Storage' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const fileResponse = await fetch(datasource.url_or_path);

    if (!fileResponse.ok) {
      console.error('Failed to fetch file:', fileResponse.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch file from storage' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const fileBlob = await fileResponse.blob();
    const contentType = fileResponse.headers.get('Content-Type') || 'application/octet-stream';

    return new Response(fileBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${datasource.source_filename}"`,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});