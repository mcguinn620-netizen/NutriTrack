import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const BASE_URL = 'https://netnutrition.bsu.edu/NetNutrition';
const DEFAULT_TIMEOUT_MS = 15000;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractHidden(html: string, name: string): string {
  const escaped = escapeRegExp(name);
  const inputRegex = new RegExp(
    `<input[^>]*name=["']${escaped}["'][^>]*value=["']([\\s\\S]*?)["'][^>]*>`,
    'i',
  );
  const match = html.match(inputRegex);
  return match?.[1] ?? '';
}

function extractFields(html: string) {
  return {
    viewstate: extractHidden(html, '__VIEWSTATE'),
    eventvalidation: extractHidden(html, '__EVENTVALIDATION'),
    viewstategenerator: extractHidden(html, '__VIEWSTATEGENERATOR'),
  };
}

function getSetCookieHeaders(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetSetCookie.getSetCookie === 'function') {
    return withGetSetCookie.getSetCookie();
  }

  const combined = headers.get('set-cookie');
  if (!combined) return [];

  // Fallback for environments that merge multiple Set-Cookie headers into one line.
  return combined.split(/,(?=[^;]+=[^;]+)/g).map((cookie) => cookie.trim());
}

class Session {
  private cookies = new Map<string, string>();

  update(response: Response): void {
    for (const setCookie of getSetCookieHeaders(response.headers)) {
      const [pair] = setCookie.split(';');
      if (!pair) continue;

      const separatorIndex = pair.indexOf('=');
      if (separatorIndex <= 0) continue;

      const name = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();
      if (!name) continue;
      this.cookies.set(name, value);
    }
  }

  private cookieHeader(): string {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  headers(extra: Record<string, string> = {}): HeadersInit {
    const cookie = this.cookieHeader();

    return {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      ...(cookie ? { Cookie: cookie } : {}),
      ...extra,
    };
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('Request timeout'), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchJsonWithSession(
  session: Session,
  path: string,
  payload: Record<string, unknown>,
): Promise<any> {
  const response = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: session.headers({
      'Content-Type': 'application/json; charset=UTF-8',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: 'https://netnutrition.bsu.edu',
      Referer: `${BASE_URL}/1`,
    }),
    body: JSON.stringify(payload),
  });

  session.update(response);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`POST ${path} failed (${response.status}): ${body.slice(0, 300)}`);
  }

  return await response.json();
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true }, 200);
  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use GET or POST.' }, 405);
  }

  const session = new Session();

  try {
    const initialResponse = await fetchWithTimeout(`${BASE_URL}/1`, {
      method: 'GET',
      headers: session.headers({ Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }),
    });

    session.update(initialResponse);

    if (!initialResponse.ok) {
      const body = await initialResponse.text();
      throw new Error(`Initial page load failed (${initialResponse.status}): ${body.slice(0, 300)}`);
    }

    const initialHtml = await initialResponse.text();
    const fields = extractFields(initialHtml);

    if (!fields.viewstate || !fields.eventvalidation) {
      throw new Error('Required ASP.NET hidden fields (__VIEWSTATE / __EVENTVALIDATION) were missing.');
    }

    const continueForm = new URLSearchParams({
      __EVENTTARGET: '',
      __EVENTARGUMENT: '',
      __VIEWSTATE: fields.viewstate,
      __EVENTVALIDATION: fields.eventvalidation,
      __VIEWSTATEGENERATOR: fields.viewstategenerator,
      'ctl00$MainContent$btnContinue': 'Continue',
    });

    const continueResponse = await fetchWithTimeout(`${BASE_URL}/1`, {
      method: 'POST',
      headers: session.headers({
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Origin: 'https://netnutrition.bsu.edu',
        Referer: `${BASE_URL}/1`,
      }),
      body: continueForm.toString(),
    });

    session.update(continueResponse);

    if (!continueResponse.ok) {
      const body = await continueResponse.text();
      throw new Error(`Continue postback failed (${continueResponse.status}): ${body.slice(0, 300)}`);
    }

    const root = await fetchJsonWithSession(session, '/Unit/SelectUnitFromSideBar', { unitOid: 1 });
    const units = root?.childUnitsPanel?.units;

    if (!Array.isArray(units)) {
      throw new Error('Dining halls were not returned from SelectUnitFromSideBar.');
    }

    const halls = [];

    for (const hall of units) {
      const hallData = await fetchJsonWithSession(session, '/Unit/SelectUnitFromSideBar', {
        unitOid: hall.unitOid,
      });

      const menus = Array.isArray(hallData?.menuPanel?.menus) ? hallData.menuPanel.menus : [];

      const hallResult = {
        id: hall.unitOid,
        name: hall.name,
        menus: [] as Array<{ id: number; name: string; items: Array<{ id: number; name: string }> }>,
      };

      for (const menu of menus) {
        const menuData = await fetchJsonWithSession(session, '/Menu/SelectMenu', {
          menuOid: menu.menuOid,
        });

        const items = Array.isArray(menuData?.itemPanel?.items) ? menuData.itemPanel.items : [];

        hallResult.menus.push({
          id: menu.menuOid,
          name: menu.name,
          items: items.map((item: { recipeOid: number; name: string }) => ({
            id: item.recipeOid,
            name: item.name,
          })),
        });
      }

      halls.push(hallResult);
    }

    return jsonResponse(
      {
        success: true,
        timestamp: new Date().toISOString(),
        halls,
      },
      200,
    );
  } catch (error) {
    console.error('[netnutrition edge] scrape failed:', error);

    return jsonResponse(
      {
        success: false,
        error: 'Failed to scrape NetNutrition.',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      502,
    );
  }
});
