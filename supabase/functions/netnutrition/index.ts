import { corsHeaders } from '../_shared/cors.ts';

const VERCEL_URL = 'https://nutri-track-ebon-psi.vercel.app/api/scrape';
const REQUEST_TIMEOUT_MS = 60_000;

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed. Use POST with JSON body: {"url":"..."}.' }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requestedUrl = typeof body?.url === 'string' ? body.url.trim() : '';

    if (!requestedUrl) {
      console.error('[netnutrition] Missing required body.url');
      return json({ error: 'Missing required field: url' }, 400);
    }

    if (!/^https?:\/\//i.test(requestedUrl)) {
      console.error('[netnutrition] Invalid url:', requestedUrl);
      return json({ error: 'Invalid URL. Use an absolute http/https URL.' }, 400);
    }

    console.log('[netnutrition] Forwarding request to Vercel scraper', {
      upstream: VERCEL_URL,
      sourceUrl: requestedUrl,
    });

    const upstreamResponse = await fetchWithTimeout(VERCEL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: requestedUrl }),
    });

    const upstreamText = await upstreamResponse.text();
    let upstreamBody: unknown;

    try {
      upstreamBody = upstreamText ? JSON.parse(upstreamText) : {};
    } catch {
      upstreamBody = { raw: upstreamText };
    }

    if (!upstreamResponse.ok) {
      console.error('[netnutrition] Upstream Vercel error', {
        upstream: VERCEL_URL,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        body: upstreamBody,
      });

      return json(
        {
          error: 'Failed to fetch from Vercel scraper',
          upstreamStatus: upstreamResponse.status,
          upstreamBody,
        },
        upstreamResponse.status,
      );
    }

    console.log('[netnutrition] Upstream scraper success');
    return json(upstreamBody, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[netnutrition] Fatal proxy error', { message, upstream: VERCEL_URL });
    return json({ error: message }, 500);
  }
});
