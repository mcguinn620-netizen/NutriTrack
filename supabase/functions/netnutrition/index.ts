import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

type RenderItem = {
  oid?: number;
  name?: string;
  nutrition?: Record<string, string>;
};

type RenderMenu = {
  oid?: number;
  name?: string;
  items?: RenderItem[];
};

type RenderUnit = {
  oid?: number;
  name?: string;
  items?: RenderItem[];
  menus?: RenderMenu[];
};

type RenderPayload = {
  sourceUrl?: string;
  generatedAt?: string;
  units?: RenderUnit[];
  error?: string;
};

const RENDER_SCRAPER_URL =
  Deno.env.get('RENDER_SCRAPER_URL') ?? 'https://nutritrack-2jj9.onrender.com/netnutrition';
const STORE_RESULTS = (Deno.env.get('STORE_RESULTS') ?? 'false').toLowerCase() === 'true';
const STORAGE_TABLE = Deno.env.get('STORE_TABLE') ?? 'netnutrition_cache';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalize(payload: RenderPayload) {
  const units = Array.isArray(payload.units) ? payload.units : [];
  return {
    units: units.map((unit) => ({
      oid: unit.oid ?? 0,
      name: unit.name ?? 'Unknown Unit',
      items: Array.isArray(unit.items)
        ? unit.items.map((item) => ({
            oid: item.oid ?? 0,
            name: item.name ?? 'Unknown Item',
            nutrition: item.nutrition ?? {},
          }))
        : [],
      menus: Array.isArray(unit.menus)
        ? unit.menus.map((menu) => ({
            oid: menu.oid ?? 0,
            name: menu.name ?? 'Unknown Menu',
            items: Array.isArray(menu.items)
              ? menu.items.map((item) => ({
                  oid: item.oid ?? 0,
                  name: item.name ?? 'Unknown Item',
                  nutrition: item.nutrition ?? {},
                }))
              : [],
          }))
        : [],
    })),
    generatedAt: payload.generatedAt ?? new Date().toISOString(),
  };
}

async function persistSnapshot(snapshot: unknown): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) return;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await admin.from(STORAGE_TABLE).insert({ payload: snapshot });
  if (error) {
    console.error('[netnutrition] persist failed', error.message);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed', sourceUrl: RENDER_SCRAPER_URL }, 405);
  }

  try {
    const renderRes = await fetch(RENDER_SCRAPER_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    const renderJson = (await renderRes.json()) as RenderPayload;

    if (!renderRes.ok || renderJson.error) {
      return json(
        {
          error: renderJson.error ?? `Render scraper request failed with ${renderRes.status}`,
          sourceUrl: RENDER_SCRAPER_URL,
        },
        502,
      );
    }

    const normalized = normalize(renderJson);

    if (STORE_RESULTS) {
      await persistSnapshot({
        source_url: RENDER_SCRAPER_URL,
        generated_at: normalized.generatedAt,
        units_count: normalized.units.length,
        payload: normalized,
      });
    }

    return json({ units: normalized.units, generatedAt: normalized.generatedAt, sourceUrl: RENDER_SCRAPER_URL });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Unhandled netnutrition proxy error',
        sourceUrl: RENDER_SCRAPER_URL,
      },
      500,
    );
  }
});
