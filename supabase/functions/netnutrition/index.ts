import { DOMParser, Element } from 'https://deno.land/x/deno_dom@v0.1.57/deno-dom-wasm.ts';
import { corsHeaders } from '../_shared/cors.ts';

const NETNUTRITION_ROOT = 'http://netnutrition.bsu.edu';
const NETNUTRITION_BASE = `${NETNUTRITION_ROOT}/NetNutrition/1`;
const USER_AGENT =
  'Mozilla/5.0 (compatible; NutriTrack-NetNutrition-Scraper/1.0; +https://supabase.com)';
const RETRIES = 3;
const RETRY_DELAY_MS = 350;
const REQUEST_TIMEOUT_MS = 30_000;

interface AspNetState {
  __VIEWSTATE: string;
  __EVENTVALIDATION: string;
  __VIEWSTATEGENERATOR?: string;
}

interface UnitPayload {
  oid: number;
  name: string;
  menus: MenuPayload[];
}

interface MenuPayload {
  oid: number;
  name: string;
  items: ItemPayload[];
}

interface ItemPayload {
  oid: number;
  name: string;
  traits: string[];
  nutrition: Record<string, string>;
}

interface ActionLink {
  oid: number;
  name: string;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function parseNumericOid(raw: string, fallback = 0): number {
  const match = raw.match(/(?:^|\D)(\d{1,10})(?:\D|$)/);
  if (!match) return fallback;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDocument(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) throw new Error('Unable to parse HTML with deno_dom');
  return doc;
}

function parseSetCookie(headers: Headers, jar: Map<string, string>) {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const lines = typeof getSetCookie === 'function'
    ? getSetCookie.call(headers)
    : (headers.get('set-cookie') ? headers.get('set-cookie')!.split(/, (?=[^;]+=)/g) : []);

  for (const line of lines) {
    const [cookiePart] = line.split(';');
    const idx = cookiePart.indexOf('=');
    if (idx < 1) continue;
    jar.set(cookiePart.slice(0, idx).trim(), cookiePart.slice(idx + 1).trim());
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

function extractAspNetState(html: string): AspNetState {
  const doc = parseDocument(html);
  const vs = (doc.querySelector('input[name="__VIEWSTATE"]') as Element | null)?.getAttribute('value') ?? '';
  const ev = (doc.querySelector('input[name="__EVENTVALIDATION"]') as Element | null)?.getAttribute('value') ?? '';
  const vg = (doc.querySelector('input[name="__VIEWSTATEGENERATOR"]') as Element | null)?.getAttribute('value') ?? undefined;

  if (!vs || !ev) {
    throw new Error('Missing ASP.NET hidden fields (__VIEWSTATE/__EVENTVALIDATION)');
  }

  return {
    __VIEWSTATE: vs,
    __EVENTVALIDATION: ev,
    __VIEWSTATEGENERATOR: vg,
  };
}

function tryRefreshAspNetStateFromResponseText(text: string, current: AspNetState): AspNetState {
  try {
    return extractAspNetState(text);
  } catch {
    const vs = text.match(/__VIEWSTATE\|([^|]+)/)?.[1] ?? current.__VIEWSTATE;
    const ev = text.match(/__EVENTVALIDATION\|([^|]+)/)?.[1] ?? current.__EVENTVALIDATION;
    const vg = text.match(/__VIEWSTATEGENERATOR\|([^|]+)/)?.[1] ?? current.__VIEWSTATEGENERATOR;
    return {
      __VIEWSTATE: vs,
      __EVENTVALIDATION: ev,
      __VIEWSTATEGENERATOR: vg,
    };
  }
}

function parsePanelHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as { panels?: Array<{ html?: string }>; html?: string; errorHTML?: string };
      if (parsed.errorHTML) return parsed.errorHTML;
      if (Array.isArray(parsed.panels) && parsed.panels.length) {
        return parsed.panels.map((p) => p.html ?? '').join('\n');
      }
      return parsed.html ?? trimmed;
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

function parseLinksByAction(html: string, actions: string[]): ActionLink[] {
  const doc = parseDocument(html);
  const nodes = doc.querySelectorAll('a,button,li,div,span,tr,td');
  const out: ActionLink[] = [];
  const seen = new Set<string>();

  nodes.forEach((node, idx) => {
    const raw = [
      node.getAttribute('onclick'),
      node.getAttribute('href'),
      node.getAttribute('data-url'),
      node.getAttribute('id'),
    ].filter(Boolean).join(' ');

    if (!raw) return;
    if (!actions.some((action) => raw.toLowerCase().includes(action.toLowerCase()))) return;

    const name = stripText(node.textContent) || stripText(node.getAttribute('title')) || `item-${idx + 1}`;
    const oid = parseNumericOid(raw, idx + 1);
    const key = `${oid}:${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ oid, name });
  });

  return out;
}

function parseItems(html: string): Array<{ oid: number; name: string }> {
  const doc = parseDocument(html);
  const out: Array<{ oid: number; name: string }> = [];
  const seen = new Set<number>();

  doc.querySelectorAll('tr,li,div').forEach((node, idx) => {
    const raw = [
      node.getAttribute('onclick') ?? '',
      node.getAttribute('href') ?? '',
      (node as Element).outerHTML ?? '',
    ].join(' ');

    if (!/SelectItem|cbm\d+|ShowItemNutritionLabel/i.test(raw)) return;

    const oid = parseNumericOid(raw, idx + 1);
    if (seen.has(oid)) return;

    const nameNode = node.querySelector('.cbo_nn_itemPrimaryName')
      ?? node.querySelector('[class*="itemPrimaryName"]')
      ?? node.querySelector('a')
      ?? node;

    const name = stripText(nameNode?.textContent);
    if (!name || /^\d+$/.test(name)) return;

    seen.add(oid);
    out.push({ oid, name });
  });

  return out;
}

function parseNutrition(html: string): Record<string, string> {
  const doc = parseDocument(html);
  const nutrition: Record<string, string> = {};

  doc.querySelectorAll('tr').forEach((row) => {
    const cells = row.querySelectorAll('th,td');
    if (cells.length < 2) return;
    const key = stripText(cells[0]?.textContent);
    const value = stripText(cells[cells.length - 1]?.textContent);
    if (!key || !value) return;
    nutrition[key] = value;
  });

  if (!Object.keys(nutrition).length) {
    const text = stripText(doc.querySelector('body')?.textContent ?? doc.textContent ?? '');
    for (const segment of text.split(/\s{2,}|\|/g)) {
      const [k, ...rest] = segment.split(':');
      const key = stripText(k);
      const value = stripText(rest.join(':'));
      if (key && value) nutrition[key] = value;
    }
  }

  return nutrition;
}

class NetNutritionClient {
  private jar = new Map<string, string>();
  private state: AspNetState | null = null;

  private buildForm(extra: Record<string, string>): URLSearchParams {
    if (!this.state) throw new Error('ASP.NET state not initialized');

    const form = new URLSearchParams({
      __VIEWSTATE: this.state.__VIEWSTATE,
      __EVENTVALIDATION: this.state.__EVENTVALIDATION,
      ...extra,
    });

    if (this.state.__VIEWSTATEGENERATOR) {
      form.set('__VIEWSTATEGENERATOR', this.state.__VIEWSTATEGENERATOR);
    }

    return form;
  }

  private async fetchWithRetry(url: string, init: RequestInit, op: string): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const res = await fetch(url, {
          ...init,
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) throw new Error(`${op} failed with HTTP ${res.status}`);
        return res;
      } catch (error) {
        clearTimeout(timer);
        lastError = error;
        if (attempt < RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
      }
    }

    throw new Error(`${op} failed after ${RETRIES} attempts: ${String(lastError)}`);
  }

  async init(url = NETNUTRITION_BASE): Promise<string> {
    const res = await this.fetchWithRetry(`${url}#`, {
      method: 'GET',
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml',
      },
    }, 'GET homepage');

    parseSetCookie(res.headers, this.jar);
    const html = await res.text();
    this.state = extractAspNetState(html);
    return html;
  }

  private async post(path: string, payload: Record<string, string>): Promise<string> {
    const form = this.buildForm(payload);
    const res = await this.fetchWithRetry(`${NETNUTRITION_BASE}/${path}`, {
      method: 'POST',
      headers: {
        'user-agent': USER_AGENT,
        accept: 'application/json,text/html,*/*',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
        origin: NETNUTRITION_ROOT,
        referer: `${NETNUTRITION_BASE}#`,
        cookie: cookieHeader(this.jar),
      },
      body: form.toString(),
    }, `POST ${path}`);

    parseSetCookie(res.headers, this.jar);
    const text = await res.text();
    if (this.state) this.state = tryRefreshAspNetStateFromResponseText(text, this.state);
    return parsePanelHtml(text);
  }

  async selectUnitFromUnitsList(unitOid: number): Promise<string> {
    return await this.post('Unit/SelectUnitFromUnitsList', {
      unitOid: String(unitOid),
      selectedUnitOid: String(unitOid),
    });
  }

  async selectUnitFromChildUnitsList(unitOid: number): Promise<string> {
    return await this.post('Unit/SelectUnitFromChildUnitsList', {
      unitOid: String(unitOid),
      childUnitOid: String(unitOid),
      selectedUnitOid: String(unitOid),
    });
  }

  async selectMenu(menuOid: number): Promise<string> {
    return await this.post('Menu/SelectMenu', {
      menuOid: String(menuOid),
      selectedMenuOid: String(menuOid),
    });
  }

  async selectItem(detailOid: number, menuOid?: number): Promise<string> {
    const data: Record<string, string> = { detailOid: String(detailOid) };
    if (menuOid) data.menuOid = String(menuOid);
    return await this.post('Menu/SelectItem', data);
  }

  async selectTrait(traitOid: number, menuOid?: number): Promise<string> {
    const data: Record<string, string> = { traitOid: String(traitOid) };
    if (menuOid) data.menuOid = String(menuOid);
    return await this.post('Menu/SelectTrait', data);
  }

  async showItemNutritionLabel(detailOid: number, menuOid?: number): Promise<string> {
    const data: Record<string, string> = { detailOid: String(detailOid) };
    if (menuOid) data.menuOid = String(menuOid);
    return await this.post('NutritionDetail/ShowItemNutritionLabel', data);
  }

  async showMenuDetailNutritionGrid(menuOid: number, detailOid?: number): Promise<string> {
    const data: Record<string, string> = { menuOid: String(menuOid) };
    if (detailOid) data.detailOid = String(detailOid);
    return await this.post('NutritionDetail/ShowMenuDetailNutritionGrid', data);
  }
}

async function scrape(url: string): Promise<{ units: UnitPayload[]; generatedAt: string; sourceUrl: string }> {
  const client = new NetNutritionClient();
  const homeHtml = await client.init(url);

  const topUnits = parseLinksByAction(homeHtml, [
    'Unit/SelectUnitFromUnitsList',
    'SelectUnitFromUnitsList',
  ]);

  const resultUnits: UnitPayload[] = [];

  for (const topUnit of topUnits) {
    let unitHtml = await client.selectUnitFromUnitsList(topUnit.oid);

    const childUnits = parseLinksByAction(unitHtml, [
      'Unit/SelectUnitFromChildUnitsList',
      'SelectUnitFromChildUnitsList',
    ]);

    const unitsToVisit = childUnits.length ? childUnits : [topUnit];

    for (const unit of unitsToVisit) {
      if (childUnits.length) {
        unitHtml = await client.selectUnitFromChildUnitsList(unit.oid);
      }

      const menus = parseLinksByAction(unitHtml, ['Menu/SelectMenu', 'SelectMenu']);
      const menuPayloads: MenuPayload[] = [];

      for (const menu of menus) {
        const menuHtml = await client.selectMenu(menu.oid);

        const traits = parseLinksByAction(menuHtml, ['SelectTrait']);
        const traitToItems = new Map<number, Set<number>>();
        for (const trait of traits) {
          const traitHtml = await client.selectTrait(trait.oid, menu.oid);
          const traitItems = parseItems(traitHtml);
          traitToItems.set(trait.oid, new Set(traitItems.map((i) => i.oid)));
        }

        const items = parseItems(menuHtml);
        const menuItems: ItemPayload[] = [];

        for (const item of items) {
          // exercise SelectItem navigation even when data already exists in menu panel
          await client.selectItem(item.oid, menu.oid);

          let nutrition = parseNutrition(await client.showItemNutritionLabel(item.oid, menu.oid));
          if (!Object.keys(nutrition).length) {
            nutrition = parseNutrition(await client.showMenuDetailNutritionGrid(menu.oid, item.oid));
          }

          const itemTraits = traits
            .filter((trait) => traitToItems.get(trait.oid)?.has(item.oid))
            .map((trait) => trait.name);

          menuItems.push({
            oid: item.oid,
            name: item.name,
            traits: itemTraits,
            nutrition,
          });
        }

        menuPayloads.push({
          oid: menu.oid,
          name: menu.name,
          items: menuItems,
        });
      }

      resultUnits.push({
        oid: unit.oid,
        name: unit.name,
        menus: menuPayloads,
      });
    }
  }

  return {
    units: resultUnits,
    generatedAt: new Date().toISOString(),
    sourceUrl: `${url}#`,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['GET', 'POST'].includes(req.method)) {
    return json({ error: 'Method not allowed. Use GET or POST.' }, 405);
  }

  try {
    let url = NETNUTRITION_BASE;

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.url === 'string' && body.url.trim()) url = body.url.trim();
    } else {
      const reqUrl = new URL(req.url);
      const fromQuery = reqUrl.searchParams.get('url');
      if (fromQuery) url = fromQuery;
    }

    if (!/^https?:\/\//i.test(url)) {
      return json({ error: 'Invalid URL. Expected absolute http/https URL.' }, 400);
    }

    const data = await scrape(url.replace(/#$/, ''));
    return json(data, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[netnutrition] scrape failure', { message });
    return json({ error: message }, 500);
  }
});
