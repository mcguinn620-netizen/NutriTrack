import { corsHeaders } from '../_shared/cors.ts';

const RENDER_URL = 'https://nutritrack-2jj9.onrender.com/scrape';
const REQUEST_TIMEOUT_MS = 60_000;

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['GET', 'POST'].includes(req.method)) {
    return json({ error: 'Method not allowed. Use GET or POST.' }, 405);
  }

  try {
    const incomingUrl = new URL(req.url);
    const body = req.method === 'POST' ? ((await req.json().catch(() => ({}))) as { url?: string }) : null;
    const sourceUrl = body?.url?.trim() || incomingUrl.searchParams.get('url');

    const renderUrl = new URL(RENDER_URL);
    if (sourceUrl) renderUrl.searchParams.set('url', sourceUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(renderUrl.toString(), {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
    } catch (fetchError) {
      const details = fetchError instanceof Error ? fetchError.message : String(fetchError);
      return json({ error: 'Failed to reach Render scraper service.', details, endpoint: RENDER_URL }, 502);
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await upstreamResponse.text();
    const parsedJson = rawText ? JSON.parse(rawText) : {};

    if (!upstreamResponse.ok) {
      return json(
        {
          error: 'Render scraper request failed.',
          endpoint: RENDER_URL,
          status: upstreamResponse.status,
          details: parsedJson,
        },
        502,
      );
    }

    return json(parsedJson, 200);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error('[netnutrition] unexpected proxy error', { details });
    return json({ error: 'Unexpected error while requesting Render scraper.', details }, 500);
  }
});
