import { supabase } from '../lib/supabase';
import { createDatasourceSchema } from '../lib/validation';
import type { Datasource } from '../lib/supabase';

async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function listDatasources(botId: string): Promise<Datasource[]> {
  const { data, error } = await supabase
    .from('datasources')
    .select('*')
    .eq('bot_id', botId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch datasources');
  }

  return data || [];
}

export async function createDatasource(
  botId: string,
  params: {
    type: 'text' | 'csv' | 'url' | 'pdf';
    file?: File;
    url?: string;
    text?: string;
    source_filename?: string;
  }
) {
  const validation = createDatasourceSchema.safeParse(params);
  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const { data: bot } = await supabase
    .from('bots')
    .select('n8n_ingest_url')
    .eq('id', botId)
    .maybeSingle();

  if (!bot) {
    throw new Error('Bot not found');
  }

  let urlOrPath = '';
  let sourceFilename = params.source_filename || 'unknown';
  let contentHash = '';
  let processedPath = null;

  if (params.file) {
    const fileExt = params.file.name.split('.').pop() || '';
    const fileName = `${globalThis.crypto.randomUUID()}.${fileExt}`;
    const filePath = `bots/${botId}/docs/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('bots')
      .upload(filePath, params.file);

    if (uploadError) {
      throw new Error('Failed to upload file');
    }

    urlOrPath = filePath;
    sourceFilename = params.file.name;
    contentHash = await generateHash(`${params.file.name}-${params.file.size}`);

    if (params.type === 'text') {
      processedPath = filePath;
    }
  } else if (params.url) {
    urlOrPath = params.url;
    sourceFilename = 'remote';
    contentHash = await generateHash(params.url);
  } else if (params.text) {
    urlOrPath = 'inline';
    sourceFilename = 'inline.txt';
    contentHash = await generateHash(params.text);
  }

  const { data: existingDs } = await supabase
    .from('datasources')
    .select('id')
    .eq('bot_id', botId)
    .eq('content_hash', contentHash)
    .maybeSingle();

  if (existingDs) {
    return existingDs;
  }

  const { data: datasource, error: insertError } = await supabase
    .from('datasources')
    .insert({
      bot_id: botId,
      type: params.type,
      source_filename: sourceFilename,
      url_or_path: urlOrPath,
      processed_path: processedPath,
      content_hash: contentHash,
      status: 'new',
    })
    .select()
    .single();

  if (insertError) {
    throw new Error('Failed to create datasource');
  }

  await supabase.from('events').insert({
    bot_id: botId,
    type: 'INGEST_START',
    payload_json: { datasource_id: datasource.id, type: params.type },
  });

  try {
    const formData = new FormData();
    formData.append('bot_id', botId);
    formData.append('datasource_id', datasource.id);
    formData.append('type', params.type);
    formData.append('source_filename', sourceFilename);
    formData.append('url_or_path', urlOrPath);
    formData.append('content_hash', contentHash);

    if (params.file) {
      formData.append('file', params.file);
    } else if (params.text) {
      formData.append('text', params.text);
    } else if (params.url) {
      formData.append('url', params.url);
    }

    await fetch(bot.n8n_ingest_url, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    console.error('Failed to call n8n ingest webhook:', error);
  }

  return datasource;
}

export async function reindexDatasource(botId: string, datasourceId: string) {
  const { data: datasource } = await supabase
    .from('datasources')
    .select('*')
    .eq('id', datasourceId)
    .eq('bot_id', botId)
    .maybeSingle();

  if (!datasource) {
    throw new Error('Datasource not found');
  }

  await supabase
    .from('datasources')
    .update({ status: 'new' })
    .eq('id', datasourceId);

  await supabase.from('events').insert({
    bot_id: botId,
    type: 'REINDEX_REQUEST',
    payload_json: { datasource_id: datasourceId },
  });

  return { success: true };
}

export async function deleteDatasource(botId: string, datasourceId: string) {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-datasource`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ datasourceId, botId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete datasource');
  }

  return { success: true };
}
