import { corsHeaders } from '../_shared/cors.ts';

const DEFAULT_RENDER_ENDPOINT =
  'https://<your-render-service>.onrender.com/scrape';
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

function resolveRenderEndpoint(): string {
  const endpoint = Deno.env.get('RENDER_SCRAPER_URL')?.trim() || DEFAULT_RENDER_ENDPOINT;
  return endpoint.replace(/\/$/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['GET', 'POST'].includes(req.method)) {
    return json({ error: 'Method not allowed. Use GET or POST.' }, 405);
  }

  try {
    let url: string | null = null;

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.url === 'string' && body.url.trim()) {
        url = body.url.trim();
      }
    } else {
      const reqUrl = new URL(req.url);
      url = reqUrl.searchParams.get('url');
    }

    const renderEndpoint = resolveRenderEndpoint();
    const target = new URL(renderEndpoint);
    if (url) target.searchParams.set('url', url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let renderResponse: Response;
    try {
      renderResponse = await fetch(target.toString(), {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await renderResponse.text();
    const responseJson = responseText ? JSON.parse(responseText) : {};

    if (!renderResponse.ok) {
      const upstreamError =
        typeof responseJson?.error === 'string'
          ? responseJson.error
          : `Render endpoint failed with HTTP ${renderResponse.status}`;

      return json(
        {
          error: 'Failed to scrape NetNutrition via Render service.',
          details: upstreamError,
          endpoint: target.toString(),
        },
        502,
      );
    }

    return json(responseJson, 200);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error('[netnutrition] render proxy failure', { details });

    return json(
      {
        error: 'Unexpected error while requesting Render scraper.',
        details,
      },
      500,
    );
  }
});
