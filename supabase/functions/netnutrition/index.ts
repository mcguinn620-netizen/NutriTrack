import { corsHeaders } from '../_shared/cors.ts';

interface Panel {
  id: string;
  html: string;
}

interface AjaxResponse {
  success?: boolean;
  panels?: Panel[];
  errorID?: string;
  errorHTML?: string;
}

interface Entity {
  oid: number;
  name: string;
}

interface ItemRecord {
  oid: number;
  name: string;
  traits: Entity[];
  nutrition: Record<string, string>;
}

interface MenuRecord {
  oid: number;
  name: string;
  items: ItemRecord[];
}

interface UnitRecord {
  oid: number;
  name: string;
  menus: MenuRecord[];
}

const REQUEST_TIMEOUT_MS = 25000;

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function decode(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAjax(raw: string): { panels: Map<string, string>; fullHtml: string; error?: string } {
  const panels = new Map<string, string>();
  const trimmed = raw.trim();
  if (!trimmed) return { panels, fullHtml: '' };

  try {
    const parsed = JSON.parse(trimmed) as AjaxResponse;
    if (parsed?.panels?.length) {
      for (const panel of parsed.panels) {
        if (panel?.id && typeof panel.html === 'string') panels.set(panel.id, panel.html);
      }
    }

    const fullHtml = [...panels.values()].join('\n');
    if (parsed.success === false) {
      return {
        panels,
        fullHtml,
        error: `${parsed.errorID ?? 'unknown'}: ${decode(parsed.errorHTML ?? '')}`,
      };
    }

    return { panels, fullHtml };
  } catch {
    return { panels, fullHtml: trimmed };
  }
}

function pickHtml(parsed: { panels: Map<string, string>; fullHtml: string }, prefer: string[]): string {
  for (const id of prefer) {
    const html = parsed.panels.get(id);
    if (html) return html;
  }
  return parsed.fullHtml;
}

function parseDocument(html: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

function extractOidFromAction(action: string, fnName: string): number | null {
  const match = action.match(new RegExp(`${fnName}\\((\\d+)\\)`));
  if (!match) return null;
  const oid = Number(match[1]);
  return Number.isFinite(oid) ? oid : null;
}

function parseEntityList(html: string, fnNames: string[]): Entity[] {
  if (!html) return [];

  const doc = parseDocument(html);
  const result: Entity[] = [];
  const seen = new Set<number>();
  const nodes = doc.querySelectorAll('[onclick], a[href], button[onclick], li[onclick], td[onclick], div[onclick]');

  for (const node of nodes) {
    const onclick = node.getAttribute('onclick') ?? '';
    const href = node.getAttribute('href') ?? '';
    const action = `${onclick} ${href}`;

    for (const fnName of fnNames) {
      const oid = extractOidFromAction(action, fnName);
      if (oid == null || seen.has(oid)) continue;

      const name = decode((node.textContent ?? '').trim());
      if (!name) continue;

      result.push({ oid, name });
      seen.add(oid);
    }
  }

  return result;
}

function parseNutritionPairs(html: string): Record<string, string> {
  const nutrition: Record<string, string> = {};
  if (!html) return nutrition;

  const doc = parseDocument(html);
  for (const row of doc.querySelectorAll('tr')) {
    const cells = Array.from(row.querySelectorAll('th,td'))
      .map((cell) => decode(cell.textContent ?? ''))
      .filter(Boolean);

    if (cells.length >= 2) {
      nutrition[cells[0]] = cells[cells.length - 1];
    }
  }

  return nutrition;
}

function extractSetCookieValues(headers: Headers): string[] {
  const cookieHeader = headers.get('set-cookie');
  if (!cookieHeader) return [];
  return cookieHeader.split(/,(?=\s*[^;,\s]+=)/g).map((value) => value.trim());
}

class CookieJar {
  #cookies = new Map<string, string>();

  absorb(response: Response) {
    for (const rawCookie of extractSetCookieValues(response.headers)) {
      const [pair] = rawCookie.split(';');
      const [name, ...rest] = pair.split('=');
      if (!name) continue;
      this.#cookies.set(name.trim(), rest.join('=').trim());
    }
  }

  toHeader(): string {
    return Array.from(this.#cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function postAjax(
  endpoint: string,
  body: Record<string, string | number>,
  origin: URL,
  cookieJar: CookieJar,
): Promise<{ panels: Map<string, string>; fullHtml: string; error?: string }> {
  const payload = new URLSearchParams(
    Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)])),
  ).toString();

  const cookie = cookieJar.toHeader();
  const response = await fetchWithTimeout(new URL(endpoint, origin).toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: origin.origin,
      Referer: `${origin.origin}${origin.pathname}`,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: payload,
  });

  cookieJar.absorb(response);

  const text = await response.text();
  if (!response.ok) {
    return { panels: new Map(), fullHtml: '', error: `[${response.status}] ${text.slice(0, 300)}` };
  }

  return parseAjax(text);
}

async function postAjaxAny(
  endpoints: string[],
  body: Record<string, string | number>,
  origin: URL,
  cookieJar: CookieJar,
): Promise<{ panels: Map<string, string>; fullHtml: string; error?: string }> {
  let lastError: string | undefined;
  for (const endpoint of endpoints) {
    const parsed = await postAjax(endpoint, body, origin, cookieJar);
    if (!parsed.error) return parsed;
    lastError = parsed.error;
  }

  return { panels: new Map(), fullHtml: '', error: lastError ?? 'All endpoints failed' };
}

function createEndpointOrigin(inputUrl: string): URL {
  const requested = new URL(inputUrl);
  const pathname = requested.pathname.endsWith('/') ? requested.pathname.slice(0, -1) : requested.pathname;
  return new URL(`${requested.origin}${pathname}/`);
}

async function scrapeAll(inputUrl: string): Promise<{ units: UnitRecord[]; generatedAt: string; sourceUrl: string }> {
  const startUrl = new URL(inputUrl);
  const endpointOrigin = createEndpointOrigin(inputUrl);
  const cookieJar = new CookieJar();

  const firstResponse = await fetchWithTimeout(startUrl.toString(), {
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; NetNutrition-Supabase-Edge/2.0)',
    },
  });

  cookieJar.absorb(firstResponse);

  if (!firstResponse.ok) {
    throw new Error(`Failed to load start URL: ${firstResponse.status}`);
  }

  const initialHtml = await firstResponse.text();
  const rootUnits = parseEntityList(initialHtml, [
    'unitsSelectUnit',
    'sideBarSelectUnit',
    'unitTreeSelectUnit',
  ]);

  const allUnits: UnitRecord[] = [];
  const seenUnitOids = new Set<number>();

  for (const rootUnit of rootUnits) {
    const rootPanel = await postAjax('unit/SelectUnitFromUnitsList', { unitOid: rootUnit.oid }, endpointOrigin, cookieJar);
    const rootHtml = pickHtml(rootPanel, ['menuListPanel', 'itemPanel', 'unitPanel']);
    const childUnits = parseEntityList(rootHtml, ['childUnitsSelectUnit']);

    const unitVariants: Entity[] = [rootUnit, ...childUnits];

    for (const unit of unitVariants) {
      if (seenUnitOids.has(unit.oid)) continue;
      seenUnitOids.add(unit.oid);

      const selected = unit.oid === rootUnit.oid
        ? { panels: rootPanel.panels, fullHtml: rootHtml }
        : await postAjax('unit/SelectUnitFromChildUnitsList', { unitOid: unit.oid }, endpointOrigin, cookieJar);

      const menuHostHtml = pickHtml(selected, ['menuListPanel', 'itemPanel', 'unitPanel']);
      const menus = parseEntityList(menuHostHtml, ['menuListSelectMenu']);
      const menuRecords: MenuRecord[] = [];

      for (const menu of menus) {
        const menuPanel = await postAjax('Menu/CourseItems', { menuOid: menu.oid }, endpointOrigin, cookieJar);
        const menuHtml = pickHtml(menuPanel, ['itemPanel', 'menuDetailGridPanel', 'menuPanel']);
        const items = parseEntityList(menuHtml, ['SelectItem']);

        const itemRecords: ItemRecord[] = [];

        for (const item of items) {
          const itemPanel = await postAjax('SelectItem', { detailOid: item.oid, menuOid: menu.oid }, endpointOrigin, cookieJar);
          const itemHtml = pickHtml(itemPanel, ['itemPanel', 'menuDetailGridPanel', 'nutritionLabelPanel']);

          const traits = parseEntityList(itemHtml, ['SelectTrait']);
          for (const trait of traits) {
            await postAjax('SelectTrait', {
              traitOid: trait.oid,
              detailOid: item.oid,
              menuOid: menu.oid,
            }, endpointOrigin, cookieJar);
          }

          const nutritionLabelResp = await postAjaxAny([
            'ShowItemNutritionLabel',
            'NutritionDetail/ShowItemNutritionLabel',
          ], { detailOid: item.oid, menuOid: menu.oid }, endpointOrigin, cookieJar);

          const nutritionGridResp = await postAjaxAny([
            'ShowMenuDetailNutritionGrid',
            'NutritionDetail/ShowMenuDetailNutritionGrid',
          ], { detailOid: item.oid, menuOid: menu.oid }, endpointOrigin, cookieJar);

          const nutritionLabelHtml = pickHtml(nutritionLabelResp, ['nutritionLabelPanel', 'nutritionLabel', 'itemPanel']);
          const nutritionGridHtml = pickHtml(nutritionGridResp, ['menuDetailNutritionGridPanel', 'nutritionGridPanel', 'itemPanel']);

          itemRecords.push({
            oid: item.oid,
            name: item.name,
            traits,
            nutrition: {
              ...parseNutritionPairs(nutritionLabelHtml),
              ...parseNutritionPairs(nutritionGridHtml),
            },
          });
        }

        menuRecords.push({ oid: menu.oid, name: menu.name, items: itemRecords });
      }

      allUnits.push({ oid: unit.oid, name: unit.name, menus: menuRecords });
    }
  }

  return {
    units: allUnits,
    generatedAt: new Date().toISOString(),
    sourceUrl: startUrl.toString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed. Use POST with JSON body: {"url":"..."}.' }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requestedUrl = typeof body?.url === 'string' ? body.url.trim() : '';

    if (!requestedUrl) {
      return json({ error: 'Missing required field: url' }, 400);
    }

    if (!/^https?:\/\//i.test(requestedUrl)) {
      return json({ error: 'Invalid URL. Use an absolute http/https URL.' }, 400);
    }

    const data = await scrapeAll(requestedUrl);
    return json(data);
  } catch (error) {
    console.error('[netnutrition] fatal error', error);
    return json({ error: String(error) }, 500);
  }
});
