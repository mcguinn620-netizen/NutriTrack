import { corsHeaders } from '../_shared/cors.ts';

const DEFAULT_RENDER_ENDPOINT = 'https://<your-render-service>.onrender.com/scrape';
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
  const configured = Deno.env.get('RENDER_SCRAPER_URL')?.trim();
  const endpoint = configured && configured.length > 0 ? configured : DEFAULT_RENDER_ENDPOINT;
  return endpoint.replace(/\/$/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['GET', 'POST'].includes(req.method)) {
    return json({ error: 'Method not allowed. Use GET or POST.' }, 405);
  }

  try {
    let sourceUrl: string | null = null;

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.url === 'string' && body.url.trim()) {
        sourceUrl = body.url.trim();
      }
    } else {
      const incomingUrl = new URL(req.url);
      sourceUrl = incomingUrl.searchParams.get('url');
    }

    const renderEndpoint = resolveRenderEndpoint();
    const renderUrl = new URL(renderEndpoint);
    if (sourceUrl) {
      renderUrl.searchParams.set('url', sourceUrl);
    }

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
      return json(
        {
          error: 'Failed to reach Render scraper service.',
          details,
          endpoint: renderUrl.toString(),
        },
        502,
      );
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await upstreamResponse.text();

    let parsedJson: unknown;
    try {
      parsedJson = rawText ? JSON.parse(rawText) : {};
    } catch (_parseError) {
      return json(
        {
          error: 'Render scraper returned invalid JSON.',
          endpoint: renderUrl.toString(),
          status: upstreamResponse.status,
        },
        502,
      );
    }

    if (!upstreamResponse.ok) {
      const details =
        typeof parsedJson === 'object' &&
        parsedJson !== null &&
        'error' in parsedJson &&
        typeof (parsedJson as { error?: unknown }).error === 'string'
          ? (parsedJson as { error: string }).error
          : `Render scraper returned HTTP ${upstreamResponse.status}`;

      return json(
        {
          error: 'Render scraper request failed.',
          details,
          endpoint: renderUrl.toString(),
          status: upstreamResponse.status,
        },
        502,
      );
    }

    return json(parsedJson, 200);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error('[netnutrition] unexpected proxy error', { details });

    return json(
      {
        error: 'Unexpected error while requesting Render scraper.',
        details,
      },
      500,
    );
  }
});
