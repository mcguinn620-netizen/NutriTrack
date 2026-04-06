// @ts-nocheck
import { DOMParser, Element } from 'https://deno.land/x/deno_dom@v0.1.57/deno-dom-wasm.ts';
import { corsHeaders } from '../_shared/cors';

const REQUEST_TIMEOUT_MS = 45_000;

interface ParsedTrait {
  oid: number;
  name: string;
}

interface ParsedItem {
  oid: number;
  name: string;
  traits: ParsedTrait[];
  nutrition: Record<string, string>;
}

interface ParsedMenu {
  oid: number;
  name: string;
  items: ParsedItem[];
}

interface ParsedUnit {
  oid: number;
  name: string;
  source: 'unit' | 'child-unit';
  menus: ParsedMenu[];
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function sanitizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function toPositiveNumber(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function fallbackOid(name: string, seed: number): number {
  let hash = 0;
  const text = `${name}:${seed}`;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
}

function parseOid(raw: string | null | undefined, seedName: string, seed: number): number {
  const source = raw ?? '';
  const match = source.match(/(?:\b(?:oid|id|menuOid|unitOid|itemOid|traitOid)\b[=:\/]*)(\d+)/i)
    ?? source.match(/\b(\d{1,9})\b/);

  if (!match) return fallbackOid(seedName, seed);
  return toPositiveNumber(Number(match[1])) || fallbackOid(seedName, seed);
}

function extractActionRaw(el: Element): string {
  const attrs = [
    el.getAttribute('onclick'),
    el.getAttribute('href'),
    el.getAttribute('data-url'),
    el.getAttribute('data-action'),
    el.getAttribute('data-bind'),
    el.getAttribute('aria-label'),
    el.getAttribute('id'),
  ].filter(Boolean);

  return attrs.join(' ');
}

function isActionMatch(raw: string, actions: string[]): boolean {
  return actions.some((action) => raw.toLowerCase().includes(action.toLowerCase()));
}

function extractLinksByAction(root: Element, actions: string[]): Array<{ name: string; oid: number; raw: string; element: Element }> {
  const links = root.querySelectorAll('a, button, [role="button"], [data-oid], [onclick], [href]');
  const seen = new Set<string>();
  const results: Array<{ name: string; oid: number; raw: string; element: Element }> = [];

  links.forEach((el, index) => {
    const raw = extractActionRaw(el);
    if (!raw || !isActionMatch(raw, actions)) return;

    const name = sanitizeText(el.textContent) || sanitizeText(el.getAttribute('title')) || `Unnamed ${actions[0]}`;
    const oid = parseOid(`${raw} ${el.getAttribute('data-oid') ?? ''}`, name, index + 1);
    const dedupeKey = `${actions[0]}::${oid}::${name}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    results.push({ name, oid, raw, element: el });
  });

  return results;
}

function parseNutritionTable(root: Element): Record<string, string> {
  const nutrition: Record<string, string> = {};

  root.querySelectorAll('table tr').forEach((row) => {
    const cells = row.querySelectorAll('th, td');
    if (cells.length < 2) return;

    const key = sanitizeText(cells[0]?.textContent);
    const value = sanitizeText(cells[1]?.textContent);
    if (!key || !value) return;

    nutrition[key] = value;
  });

  // Fallback parser for "Label: Value" text blocks.
  if (!Object.keys(nutrition).length) {
    const text = sanitizeText(root.textContent);
    const pairs = text.split(/\s{2,}|\|/g);
    for (const pair of pairs) {
      const [k, ...rest] = pair.split(':');
      const key = sanitizeText(k);
      const value = sanitizeText(rest.join(':'));
      if (key && value) nutrition[key] = value;
    }
  }

  return nutrition;
}

function parseDocument(html: string, sourceUrl: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) throw new Error('Failed to parse HTML with deno_dom');

  const body = doc.querySelector('body');
  if (!body) throw new Error('Missing <body> in upstream HTML');

  const unitLinks = extractLinksByAction(body, [
    'unit/SelectUnitFromUnitsList',
    'unit/SelectUnitFromChildUnitsList',
  ]);

  const globalMenus = extractLinksByAction(body, ['Menu/CourseItems']).map((menu) => ({
    oid: menu.oid,
    name: menu.name,
    items: [] as ParsedItem[],
    raw: menu.raw,
    element: menu.element,
  }));

  const globalTraits = extractLinksByAction(body, ['SelectTrait']).map((trait) => ({
    oid: trait.oid,
    name: trait.name,
  }));

  const nutritionContexts = extractLinksByAction(body, [
    'ShowItemNutritionLabel',
    'ShowMenuDetailNutritionGrid',
  ]).map((entry) => ({
    oid: entry.oid,
    nutrition: parseNutritionTable(entry.element.closest('table, div, section, article') ?? body),
  }));

  const globalNutrition = nutritionContexts.reduce<Record<number, Record<string, string>>>((acc, ctx) => {
    if (Object.keys(ctx.nutrition).length) acc[ctx.oid] = ctx.nutrition;
    return acc;
  }, {});

  const globalItems = extractLinksByAction(body, ['SelectItem']).map((item, idx) => ({
    oid: item.oid,
    name: item.name,
    traits: globalTraits,
    nutrition: globalNutrition[item.oid] ?? {},
    seed: idx,
    element: item.element,
  }));

  const units: ParsedUnit[] = (unitLinks.length ? unitLinks : [{
    name: 'BSU NetNutrition',
    oid: fallbackOid('BSU NetNutrition', 1),
    raw: 'unit/SelectUnitFromUnitsList',
    element: body,
  }]).map((unit, unitIndex) => {
    const unitScope = unit.element.closest('section, article, div, li, table') ?? body;

    const menusInUnit = extractLinksByAction(unitScope, ['Menu/CourseItems']);
    const menuSeed = menusInUnit.length ? menusInUnit : globalMenus;

    const menus: ParsedMenu[] = menuSeed.map((menu, menuIndex) => {
      const menuScope = ('element' in menu ? menu.element : unitScope).closest('section, article, div, li, table') ?? unitScope;
      const itemsInMenu = extractLinksByAction(menuScope, ['SelectItem']);
      const itemSeed = itemsInMenu.length ? itemsInMenu : globalItems;

      const items: ParsedItem[] = itemSeed.map((item, itemIndex) => {
        const itemElement = ('element' in item ? item.element : menuScope);
        const itemScope = itemElement.closest('tr, li, article, section, div') ?? itemElement;
        const itemTraits = extractLinksByAction(itemScope, ['SelectTrait']).map((trait) => ({
          oid: trait.oid,
          name: trait.name,
        }));

        const hasNutritionTrigger = extractLinksByAction(itemScope, [
          'ShowItemNutritionLabel',
          'ShowMenuDetailNutritionGrid',
        ]);

        const scopedNutrition = parseNutritionTable(itemScope.closest('table, div, section, article') ?? itemScope);

        return {
          oid: item.oid,
          name: item.name,
          traits: itemTraits.length ? itemTraits : globalTraits,
          nutrition: hasNutritionTrigger.length
            ? (Object.keys(scopedNutrition).length ? scopedNutrition : (globalNutrition[item.oid] ?? {}))
            : (globalNutrition[item.oid] ?? scopedNutrition),
        };
      });

      return {
        oid: menu.oid,
        name: menu.name,
        items,
      };
    });

    return {
      oid: unit.oid,
      name: unit.name,
      source: unit.raw.includes('SelectUnitFromChildUnitsList') ? 'child-unit' : 'unit',
      menus,
    };
  });

  return {
    units,
    generatedAt: new Date().toISOString(),
    sourceUrl,
  };
}

async function fetchWithTimeout(input: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      method: 'GET',
      headers: {
        'User-Agent': 'NutriTrack-Supabase-Edge/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
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
    const url = typeof body?.url === 'string' ? body.url.trim() : '';

    if (!url) {
      console.error('[netnutrition] Missing required field: url');
      return json({ error: 'Missing required field: url' }, 400);
    }

    if (!/^https?:\/\//i.test(url)) {
      console.error('[netnutrition] Invalid URL format', { url });
      return json({ error: 'Invalid URL. Use an absolute http/https URL.' }, 400);
    }

    console.log('[netnutrition] Starting HTML scraper', { url });
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      const upstreamBody = await response.text();
      console.error('[netnutrition] Upstream fetch failed', {
        url,
        status: response.status,
        statusText: response.statusText,
      });
      return json({
        error: 'Failed to fetch NetNutrition HTML page',
        upstreamStatus: response.status,
        upstreamStatusText: response.statusText,
        upstreamBody,
      }, response.status);
    }

    const html = await response.text();
    const result = parseDocument(html, url);

    console.log('[netnutrition] Parsed NetNutrition HTML', {
      url,
      units: result.units.length,
      menus: result.units.reduce((sum, unit) => sum + unit.menus.length, 0),
      items: result.units.reduce(
        (sum, unit) => sum + unit.menus.reduce((menuSum, menu) => menuSum + menu.items.length, 0),
        0,
      ),
    });

    return json(result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[netnutrition] Fatal scraper error', { message });
    return json({ error: message }, 500);
  }
});
