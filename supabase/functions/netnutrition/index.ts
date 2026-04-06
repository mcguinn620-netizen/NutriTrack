import { chromium } from 'npm:playwright@1.53.0';
import { corsHeaders } from '../_shared/cors.ts';

const ROOT = 'http://netnutrition.bsu.edu';
const APP_PATH = '/NetNutrition/1';
const START_URL = `${ROOT}${APP_PATH}#`;

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

interface ItemRecord {
  oid: number;
  name: string;
  traits: Array<{ oid: number; name: string }>;
  nutritionLabel: Record<string, unknown> | null;
  nutritionGrid: Record<string, unknown> | null;
}

interface MenuRecord {
  oid: number;
  name: string;
  items: ItemRecord[];
}

interface UnitRecord {
  oid: number;
  name: string;
  source: 'unit' | 'child-unit';
  menus: MenuRecord[];
}

function decode(v: string): string {
  return v
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '')
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
    if (parsed.success === false) {
      return {
        panels,
        fullHtml: [...panels.values()].join('\n'),
        error: `${parsed.errorID ?? 'unknown'}: ${decode(parsed.errorHTML ?? '')}`,
      };
    }
    return { panels, fullHtml: [...panels.values()].join('\n') };
  } catch {
    return { panels, fullHtml: trimmed };
  }
}

function pickHtml(parsed: { panels: Map<string, string>; fullHtml: string }, prefer: string[]): string {
  for (const id of prefer) {
    const hit = parsed.panels.get(id);
    if (hit) return hit;
  }
  return parsed.fullHtml;
}

function parseEntityList(html: string, fnName: string): Array<{ oid: number; name: string }> {
  const results: Array<{ oid: number; name: string }> = [];
  const seen = new Set<number>();
  const re = new RegExp(
    `<(?:a|button|li|td|div)[^>]{0,900}(?:onclick|href)=["'][^"']*${fnName}\\((\\d+)\\)[^"']*["'][^>]*>([\\s\\S]{1,600}?)<\\/(?:a|button|li|td|div)>`,
    'gi',
  );

  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const oid = Number(match[1]);
    if (!Number.isFinite(oid) || seen.has(oid)) continue;
    const name = decode(match[2]);
    if (!name) continue;
    results.push({ oid, name });
    seen.add(oid);
  }

  return results;
}

function parseNutritionPairs(html: string): Record<string, string> {
  const nutrition: Record<string, string> = {};
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(html)) !== null) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((c) => decode(c[1]))
      .filter(Boolean);
    if (cells.length >= 2) nutrition[cells[0]] = cells[cells.length - 1];
  }
  return nutrition;
}

async function postAjax(
  page: any,
  endpoint: string,
  body: Record<string, string | number>,
): Promise<{ panels: Map<string, string>; fullHtml: string; error?: string }> {
  const payload = new URLSearchParams(
    Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)])),
  ).toString();

  console.log(`[postAjax] POST ${endpoint} body=${payload}`);
  const res = await page.request.post(`${ROOT}${APP_PATH}/${endpoint}`, {
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: ROOT,
      Referer: `${ROOT}${APP_PATH}/`,
    },
    data: payload,
  });

  const text = await res.text();
  console.log(`[postAjax] ${endpoint} status=${res.status()} len=${text.length}`);
  return parseAjax(text);
}

async function postAjaxAny(
  page: any,
  endpoints: string[],
  body: Record<string, string | number>,
): Promise<{ panels: Map<string, string>; fullHtml: string; error?: string }> {
  let lastError = '';
  for (const endpoint of endpoints) {
    const parsed = await postAjax(page, endpoint, body);
    if (!parsed.error) return parsed;
    lastError = parsed.error;
  }
  return { panels: new Map(), fullHtml: '', error: lastError || 'All endpoints failed' };
}

async function scrapeAll(): Promise<{ units: UnitRecord[]; generatedAt: string }> {
  console.log('[scrape] launching playwright browser');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`[scrape] goto ${START_URL}`);
    await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle');

    const initialHtml = await page.content();
    const rootUnits = parseEntityList(initialHtml, '(?:unitsSelectUnit|sideBarSelectUnit|unitTreeSelectUnit)');
    console.log(`[scrape] parsed root units=${rootUnits.length}`);

    const visitedUnitOids = new Set<number>();
    const allUnits: UnitRecord[] = [];

    for (const rootUnit of rootUnits) {
      if (visitedUnitOids.has(rootUnit.oid)) continue;
      visitedUnitOids.add(rootUnit.oid);

      console.log(`[unit] select root unit oid=${rootUnit.oid} name=${rootUnit.name}`);
      const rootPanel = await postAjax(page, 'unit/SelectUnitFromUnitsList', { unitOid: rootUnit.oid });
      const rootHtml = pickHtml(rootPanel, ['menuListPanel', 'itemPanel', 'unitPanel']);
      const childUnits = parseEntityList(rootHtml, 'childUnitsSelectUnit');
      console.log(`[unit] root oid=${rootUnit.oid} childUnits=${childUnits.length}`);

      const unitVariants: Array<{ oid: number; name: string; source: 'unit' | 'child-unit'; seedHtml?: string }> = [
        { oid: rootUnit.oid, name: rootUnit.name, source: 'unit', seedHtml: rootHtml },
        ...childUnits.map((c) => ({ oid: c.oid, name: c.name, source: 'child-unit' as const })),
      ];

      for (const variant of unitVariants) {
        console.log(`[unit] processing source=${variant.source} oid=${variant.oid} name=${variant.name}`);
        const selected =
          variant.source === 'unit'
            ? { panels: rootPanel.panels, fullHtml: variant.seedHtml ?? rootHtml }
            : await postAjax(page, 'unit/SelectUnitFromChildUnitsList', { unitOid: variant.oid });

        // AJAX settle wait for dynamic updates between chained calls.
        await page.waitForTimeout(125);

        const menuHostHtml = pickHtml(selected, ['menuListPanel', 'itemPanel', 'unitPanel']);
        const menus = parseEntityList(menuHostHtml, 'menuListSelectMenu');
        console.log(`[menu] unit=${variant.oid} menus=${menus.length}`);

        const menuRecords: MenuRecord[] = [];

        for (const menu of menus) {
          console.log(`[menu] loading Menu/CourseItems menuOid=${menu.oid}`);
          const menuPanel = await postAjax(page, 'Menu/CourseItems', { menuOid: menu.oid });
          await page.waitForTimeout(100);
          const menuHtml = pickHtml(menuPanel, ['itemPanel', 'menuDetailGridPanel', 'menuPanel']);

          const items = parseEntityList(menuHtml, 'SelectItem');
          console.log(`[item] menu=${menu.oid} items=${items.length}`);

          const itemRecords: ItemRecord[] = [];

          for (const item of items) {
            console.log(`[item] select itemOid=${item.oid}`);
            const itemPanel = await postAjax(page, 'SelectItem', { detailOid: item.oid, menuOid: menu.oid });
            const itemHtml = pickHtml(itemPanel, ['itemPanel', 'menuDetailGridPanel', 'nutritionLabelPanel']);

            const traits = parseEntityList(itemHtml, 'SelectTrait');
            console.log(`[trait] item=${item.oid} traits=${traits.length}`);

            for (const trait of traits) {
              console.log(`[trait] select traitOid=${trait.oid} for item=${item.oid}`);
              await postAjax(page, 'SelectTrait', {
                traitOid: trait.oid,
                detailOid: item.oid,
                menuOid: menu.oid,
              });
              await page.waitForTimeout(75);
            }

            console.log(`[nutrition] ShowItemNutritionLabel detailOid=${item.oid} menuOid=${menu.oid}`);
            const nutritionLabelResp = await postAjaxAny(page, [
              'ShowItemNutritionLabel',
              'NutritionDetail/ShowItemNutritionLabel',
            ], {
              detailOid: item.oid,
              menuOid: menu.oid,
            });
            const nutritionLabelHtml = pickHtml(nutritionLabelResp, [
              'nutritionLabelPanel',
              'nutritionLabel',
              'itemPanel',
            ]);

            console.log(`[nutrition] ShowMenuDetailNutritionGrid detailOid=${item.oid} menuOid=${menu.oid}`);
            const nutritionGridResp = await postAjaxAny(page, [
              'ShowMenuDetailNutritionGrid',
              'NutritionDetail/ShowMenuDetailNutritionGrid',
            ], {
              detailOid: item.oid,
              menuOid: menu.oid,
            });
            const nutritionGridHtml = pickHtml(nutritionGridResp, [
              'menuDetailNutritionGridPanel',
              'nutritionGridPanel',
              'itemPanel',
            ]);

            itemRecords.push({
              oid: item.oid,
              name: item.name,
              traits,
              nutritionLabel: parseNutritionPairs(nutritionLabelHtml),
              nutritionGrid: parseNutritionPairs(nutritionGridHtml),
            });
          }

          menuRecords.push({ oid: menu.oid, name: menu.name, items: itemRecords });
        }

        allUnits.push({
          oid: variant.oid,
          name: variant.name,
          source: variant.source,
          menus: menuRecords,
        });
      }
    }

    return {
      units: allUnits,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action = body?.action ?? 'scrape';
    console.log(`[netnutrition] action=${action}`);

    if (action !== 'scrape') {
      return json({ error: `Unsupported action: ${action}. Use {"action":"scrape"}.` }, 400);
    }

    const data = await scrapeAll();
    return json(data);
  } catch (error) {
    console.error('[netnutrition] fatal error', error);
    return json({ error: String(error) }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
