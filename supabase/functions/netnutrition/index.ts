import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const RENDER_REFRESH_URL =
  'https://nutritrack-2jj9.onrender.com/netnutrition/scrape';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });

async function cacheLatestPayload(payload: unknown) {
  const enabled = (Deno.env.get('NETNUTRITION_CACHE_ENABLED') ?? '').toLowerCase() === 'true';
  if (!enabled) return;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceRoleKey) return;

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  // Optional cache table. If missing, we log and continue without failing the request.
  const { error } = await admin
    .from('netnutrition_cache')
    .upsert({ id: 1, payload, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  if (error) {
    console.warn('[netnutrition edge] cache upsert skipped:', error.message);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed. Use GET.' }, 405);
  }

  try {
    const renderRes = await fetch(RENDER_REFRESH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const text = await renderRes.text();
    let payload: unknown = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }

    if (!renderRes.ok) {
      return json(
        {
          error: 'Render scraper request failed',
          status: renderRes.status,
          payload,
        },
        502,
      );
    }

    await cacheLatestPayload(payload);

    return json(payload, 200);
  } catch (error) {
    return json(
      {
        error: 'Failed to reach Render scraper service',
        details: error instanceof Error ? error.message : String(error),
      },
      503,
    );
  }
});
