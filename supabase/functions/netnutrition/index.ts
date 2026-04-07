import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

const RENDER_REFRESH_URL =
  Deno.env.get('RENDER_NETNUTRITION_SCRAPE_URL') ??
  'https://nutritrack-2jj9.onrender.com/netnutrition/scrape';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CACHE_TABLE = Deno.env.get('NETNUTRITION_CACHE_TABLE') ?? 'netnutrition_cache';

async function parseJsonSafely(response: Response) {
  const bodyText = await response.text();
  try {
    return { json: JSON.parse(bodyText), raw: bodyText };
  } catch {
    return { json: null, raw: bodyText };
  }
}

async function cachePayload(payload: unknown) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const record = {
    id: 1,
    payload,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from(CACHE_TABLE).upsert(record, { onConflict: 'id' });
  if (error) {
    console.error('[edge] cache upsert failed:', error.message);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use GET.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const renderResponse = await fetch(RENDER_REFRESH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    const { json, raw } = await parseJsonSafely(renderResponse);

    if (!renderResponse.ok || !json) {
      return new Response(
        JSON.stringify({
          error: 'Render scraper request failed',
          status: renderResponse.status,
          details: json ?? raw,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    await cachePayload(json);

    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: 'Unable to reach Render scraper service',
        details: message,
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } finally {
    clearTimeout(timeout);
  }
});
