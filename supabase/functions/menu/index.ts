import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.56/deno-dom-wasm.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { corsHeaders } from '../_shared/cors.ts';

const NETNUTRITION_ROOT = 'http://netnutrition.bsu.edu';
const NETNUTRITION_BASE = `${NETNUTRITION_ROOT}/NetNutrition/1`;
const USER_AGENT =
  'Mozilla/5.0 (compatible; NetNutrition-Supabase-Edge/1.0; +https://supabase.com)';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const RETRIES = 3;

interface HiddenFields {
  __VIEWSTATE: string;
  __EVENTVALIDATION: string;
  __VIEWSTATEGENERATOR?: string;
}
interface ScrapeItem {
  id: string;
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  rawLabel: Record<string, unknown>;
  allergens?: string[];
  dietaryFlags?: string[];
}
interface ScrapeCategory { id: string; hallId: string; name: string; items: ScrapeItem[]; }
interface ScrapeHall { id: string; name: string; categories: ScrapeCategory[]; }
interface MenuResponse {
  halls: Array<{ name: string; categories: Array<{ name: string; items: Array<{ name: string; calories: number | null; protein: number | null; carbs: number | null; fat: number | null; }>; }>; }>;
  last_updated: string | null;
}

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL') ?? 'https://upjotaeatvessmbrorgx.supabase.co';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

function parseSetCookie(headers: Headers, existing: Map<string, string>): void {
  const combined = headers.get('set-cookie');
  if (!combined) return;
  const pieces = combined.split(/, (?=[^;]+=)/g);
  for (const piece of pieces) {
    const [cookiePart] = piece.split(';');
    const index = cookiePart.indexOf('=');
    if (index <= 0) continue;
    existing.set(cookiePart.slice(0, index).trim(), cookiePart.slice(index + 1).trim());
  }
}
const cookieHeader = (jar: Map<string, string>) => Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
const stripText = (v?: string | null) => (v ?? '').replace(/\s+/g, ' ').trim();
const parseNumeric = (v?: string | null) => (v ? Number(v.replace(/,/g, '').match(/\d+(?:\.\d+)?/)?.[0] ?? NaN) : NaN);
function isStartupError(text: string): boolean {
  return text.includes('NetNutrition Start-up Error') || text.includes('ANA_border');
}

function parseHtmlDocument(html: string) { const doc = new DOMParser().parseFromString(html, 'text/html'); if (!doc) throw new Error('HTML parse failed'); return doc; }
function extractHiddenFields(html: string): HiddenFields {
  const doc = parseHtmlDocument(html);
  const __VIEWSTATE = (doc.querySelector('input[name="__VIEWSTATE"]') as any)?.getAttribute('value') ?? '';
  const __EVENTVALIDATION = (doc.querySelector('input[name="__EVENTVALIDATION"]') as any)?.getAttribute('value') ?? '';
  const __VIEWSTATEGENERATOR = (doc.querySelector('input[name="__VIEWSTATEGENERATOR"]') as any)?.getAttribute('value') ?? undefined;
  if (!__VIEWSTATE || !__EVENTVALIDATION) throw new Error('Missing ASP.NET hidden fields');
  return { __VIEWSTATE, __EVENTVALIDATION, __VIEWSTATEGENERATOR };
}

function parseUnits(html: string) {
  const doc = parseHtmlDocument(html);
  const out: Array<{ id: string; name: string }> = []; const seen = new Set<string>();
  for (const el of Array.from(doc.querySelectorAll('a, button, li, div'))) {
    const raw = `${el.getAttribute('onclick') ?? ''} ${el.getAttribute('href') ?? ''}`;
    const m = raw.match(/(?:sideBarSelectUnit|unitsSelectUnit|unitTreeSelectUnit|childUnitsSelectUnit)\((\d+)\)/i); if (!m) continue;
    const id = m[1]; if (seen.has(id)) continue; const name = stripText(el.textContent); if (!name) continue;
    seen.add(id); out.push({ id, name });
  }
  return out;
}
function parseChildUnits(html: string) {
  const doc = parseHtmlDocument(html); const out: Array<{ id: string; name: string }> = []; const seen = new Set<string>();
  for (const el of Array.from(doc.querySelectorAll('a, button, li, div'))) {
    const raw = `${el.getAttribute('onclick') ?? ''} ${el.getAttribute('href') ?? ''}`;
    const m = raw.match(/(?:childUnitsSelectUnit|sideBarSelectUnit|unitsSelectUnit)\((\d+)\)/i); if (!m) continue;
    const id = m[1]; if (seen.has(id)) continue; const name = stripText(el.textContent); if (!name) continue;
    seen.add(id); out.push({ id, name });
  }
  return out;
}
function parseMenus(html: string) {
  const doc = parseHtmlDocument(html); const out: Array<{ id: string; name: string }> = []; const seen = new Set<string>();
  for (const el of Array.from(doc.querySelectorAll('a, button, li, div'))) {
    const raw = `${el.getAttribute('onclick') ?? ''} ${el.getAttribute('href') ?? ''}`;
    const m = raw.match(/menuListSelectMenu\((\d+)\)/i); if (!m) continue;
    const id = m[1]; if (seen.has(id)) continue; const name = stripText(el.textContent); if (!name) continue;
    seen.add(id); out.push({ id, name });
  }
  if (out.length) return out;
  // Fallback for variants where menu handlers are embedded in attributes only.
  for (const m of html.matchAll(/menuListSelectMenu\((\d+)\)[\s\S]{0,240}?>\s*([^<][\s\S]{0,120}?)\s*</gi)) {
    const id = m[1]; if (seen.has(id)) continue;
    const name = stripText(m[2]); if (!name) continue;
    seen.add(id); out.push({ id, name });
  }
  return out;
}
function parseItems(html: string) {
  const doc = parseHtmlDocument(html); const out: Array<{ id: string; name: string }> = []; const seen = new Set<string>();
  for (const el of Array.from(doc.querySelectorAll('tr, li, div'))) {
    const m = el.outerHTML.match(/(?:menuDetailGridCb\(this,\s*|ShowItemNutritionLabel\(|cbm)(\d+)/i); if (!m) continue;
    const id = m[1]; if (seen.has(id)) continue;
    const nameEl = el.querySelector('.cbo_nn_itemPrimaryName') ?? el.querySelector('[class*="itemPrimaryName"]') ?? el.querySelector('a') ?? el;
    const name = stripText(nameEl?.textContent); if (!name || /^\d+$/.test(name)) continue;
    seen.add(id); out.push({ id, name });
  }
  if (out.length) return out;
  // Fallback for row structure keyed by checkbox IDs.
  for (const row of Array.from(doc.querySelectorAll('tr'))) {
    const cb = row.querySelector('input[id^="cbm"]') as any;
    const id = cb?.getAttribute('id')?.replace(/^cbm/, '');
    if (!id || seen.has(id)) continue;
    const name = stripText((row.querySelector('.cbo_nn_itemPrimaryName') as any)?.textContent ?? (row.querySelector('a') as any)?.textContent ?? row.textContent);
    if (!name || /^\d+$/.test(name)) continue;
    seen.add(id); out.push({ id, name });
  }
  return out;
}

interface ParsedStationItem {
  id: string;
  name: string;
  servingSize: string | null;
  detailOid: string | null;
  allergens: string[];
  dietaryFlags: string[];
}

interface ParsedStationCategory {
  name: string;
  items: ParsedStationItem[];
}

const detailOidFromRow = (rowHtml: string): string | null => {
  const match = rowHtml.match(
    /(?:ShowItemNutritionLabel\(|menuDetailGridCb\(\s*this,\s*|detailOid["'\s:=]+|id=["']cbm)(\d+)/i,
  );
  return match?.[1] ?? null;
};

function parseStationCategoriesFromItemPanel(html: string): ParsedStationCategory[] {
  const doc = parseHtmlDocument(html);
  const itemPanel = doc.querySelector('#itemPanel') ?? doc;
  const table = itemPanel.querySelector('.cbo_nn_itemGridTable');
  if (!table) return [];

  const categories: ParsedStationCategory[] = [];
  let currentCategory: ParsedStationCategory | null = null;
  const seenItems = new Set<string>();

  for (const row of Array.from(table.querySelectorAll('tr'))) {
    const groupCell = row.querySelector('td.cbo_nn_itemGroupRow');
    if (groupCell) {
      const groupName = stripText(groupCell.textContent);
      if (!groupName) continue;
      currentCategory = { name: groupName, items: [] };
      categories.push(currentCategory);
      continue;
    }

    const nameEl = row.querySelector('.cbo_nn_itemPrimaryName')
      ?? row.querySelector('[class*="itemPrimaryName"]')
      ?? row.querySelector('a');
    const itemName = stripText(nameEl?.textContent);
    if (!itemName) continue;

    const detailOid = detailOidFromRow(row.outerHTML);
    const itemId = detailOid ?? `${itemName.toLowerCase()}_${seenItems.size}`;
    if (seenItems.has(itemId)) continue;
    seenItems.add(itemId);

    const servingSize = stripText(
      row.querySelector('.cbo_nn_itemServingSize')?.textContent
        ?? row.querySelector('[class*="itemServing"]')?.textContent
        ?? null,
    ) || null;
    const allergens: string[] = [];
    const dietaryFlags: string[] = [];
    for (const img of Array.from(row.querySelectorAll('img'))) {
      const title = stripText(img.getAttribute('title'));
      if (!title) continue;
      const lower = title.toLowerCase();
      if (lower === 'vegan' || lower === 'vegetarian') dietaryFlags.push(title);
      else allergens.push(title);
    }

    if (!currentCategory) {
      currentCategory = { name: 'All Items', items: [] };
      categories.push(currentCategory);
    }

    currentCategory.items.push({
      id: itemId,
      name: itemName,
      servingSize,
      detailOid,
      allergens,
      dietaryFlags,
    });
  }

  return categories.filter((c) => c.items.length > 0);
}

function parsePanelResponse(text: string): { panelType: 'childUnitsPanel' | 'menuPanel' | 'itemPanel' | 'unknown'; html: string; mergedHtml: string } {
  const trimmed = text.trim(); if (!trimmed) return { panelType: 'unknown', html: '', mergedHtml: '' };
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed: { panels?: Array<{ id: string; html: string }>; success?: boolean; errorHTML?: string };
    try {
      parsed = JSON.parse(trimmed) as { panels?: Array<{ id: string; html: string }>; success?: boolean; errorHTML?: string };
    } catch {
      return { panelType: 'unknown', html: trimmed, mergedHtml: trimmed };
    }
    if (parsed.success === false && parsed.errorHTML) {
      return { panelType: 'unknown', html: parsed.errorHTML, mergedHtml: parsed.errorHTML };
    }
    const panels = parsed.panels ?? []; const mergedHtml = panels.map((p) => p.html ?? '').join('\n'); const by = (id: string) => panels.find((p) => p.id === id)?.html ?? '';
    const child = by('childUnitsPanel') || by('childUnitPanel'); if (child) return { panelType: 'childUnitsPanel', html: child, mergedHtml };
    const menu = by('menuPanel') || by('menuListPanel'); if (menu) return { panelType: 'menuPanel', html: menu, mergedHtml };
    const item = by('itemPanel'); if (item) return { panelType: 'itemPanel', html: item, mergedHtml };
    if (mergedHtml.includes('menuListSelectMenu')) return { panelType: 'menuPanel', html: mergedHtml, mergedHtml };
    if (mergedHtml.includes('menuDetailGridCb')) return { panelType: 'itemPanel', html: mergedHtml, mergedHtml };
    return { panelType: 'unknown', html: mergedHtml, mergedHtml };
  }
  return { panelType: 'unknown', html: trimmed, mergedHtml: trimmed };
}

function parseNutritionLabel(html: string) {
  const doc = parseHtmlDocument(html);
  let calories: number | null = null, protein: number | null = null, carbs: number | null = null, fat: number | null = null;
  for (const row of Array.from(doc.querySelectorAll('tr'))) {
    const cells = Array.from(row.querySelectorAll('td, th')); if (cells.length < 2) continue;
    const key = stripText(cells[0].textContent).toLowerCase(); const val = stripText(cells[cells.length - 1].textContent);
    const n = Number.isFinite(parseNumeric(val)) ? parseNumeric(val) : null;
    if ((key === 'calories' || key.includes('total calories')) && calories === null) calories = n;
    else if (key.includes('protein') && protein === null) protein = n;
    else if ((key.includes('total carbohydrate') || key.includes('total carb')) && carbs === null) carbs = n;
    else if (key.includes('total fat') && fat === null) fat = n;
  }
  calories ??= Number.isFinite(parseNumeric(stripText(doc.querySelector('#lblCalories')?.textContent ?? ''))) ? parseNumeric(stripText(doc.querySelector('#lblCalories')?.textContent ?? '')) : null;
  protein ??= Number.isFinite(parseNumeric(stripText(doc.querySelector('#lblProtein')?.textContent ?? ''))) ? parseNumeric(stripText(doc.querySelector('#lblProtein')?.textContent ?? '')) : null;
  carbs ??= Number.isFinite(parseNumeric(stripText(doc.querySelector('#lblTotalCarb')?.textContent ?? ''))) ? parseNumeric(stripText(doc.querySelector('#lblTotalCarb')?.textContent ?? '')) : null;
  fat ??= Number.isFinite(parseNumeric(stripText(doc.querySelector('#lblTotalFat')?.textContent ?? ''))) ? parseNumeric(stripText(doc.querySelector('#lblTotalFat')?.textContent ?? '')) : null;
  return { calories, protein, carbs, fat, raw: { html, extracted_at: new Date().toISOString() } };
}

class NetNutritionClient {
  private cookieJar = new Map<string, string>(); private hiddenFields: HiddenFields | null = null;

  private ensureExternalCookie() {
    if (!this.cookieJar.has('CBORD.netnutrition2')) this.cookieJar.set('CBORD.netnutrition2', 'NNexternalID=1');
  }

  private async initSession(): Promise<string> {
    this.ensureExternalCookie();
    let current = `${NETNUTRITION_BASE}#`;
    for (let i = 0; i < 8; i++) {
      const res = await fetch(current, {
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml',
          cookie: cookieHeader(this.cookieJar),
        },
        redirect: 'manual',
      });
      parseSetCookie(res.headers, this.cookieJar);
      this.ensureExternalCookie();

      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, current).toString();
        continue;
      }

      if (!res.ok) throw new Error(`GET homepage failed: ${res.status}`);
      const html = await res.text();
      if (isStartupError(html)) throw new Error('Startup error on homepage bootstrap');
      this.hiddenFields = extractHiddenFields(html);
      return html;
    }
    throw new Error('GET homepage failed: too many redirects');
  }

  async getHomepage() {
    let lastErr: unknown;
    for (let i = 1; i <= RETRIES; i++) {
      try {
        const html = await this.initSession();
        return { units: parseUnits(html) };
      } catch (e) {
        lastErr = e;
        if (i < RETRIES) await new Promise((r) => setTimeout(r, i * 200));
      }
    }
    throw new Error(`Failed to initialize NetNutrition session: ${String(lastErr)}`);
  }

  private buildForm(extra: Record<string, string>) { if (!this.hiddenFields) throw new Error('Hidden ASP.NET fields not initialized'); const form = new URLSearchParams({ __VIEWSTATE: this.hiddenFields.__VIEWSTATE, __EVENTVALIDATION: this.hiddenFields.__EVENTVALIDATION, ...extra }); if (this.hiddenFields.__VIEWSTATEGENERATOR) form.set('__VIEWSTATEGENERATOR', this.hiddenFields.__VIEWSTATEGENERATOR); return form; }
  private refreshHiddenFields(html: string) { try { this.hiddenFields = extractHiddenFields(html); } catch { /* expected for panel responses */ } }
  async postWithRetry(path: string, data: Record<string, string>) {
    let lastErr: unknown;
    for (let i = 1; i <= RETRIES; i++) {
      try {
        const form = this.buildForm(data);
        this.ensureExternalCookie();
        const res = await fetch(`${NETNUTRITION_BASE}/${path}`, {
          method: 'POST',
          headers: {
            'user-agent': USER_AGENT,
            accept: 'application/json,text/html,*/*',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'x-requested-with': 'XMLHttpRequest',
            origin: NETNUTRITION_ROOT,
            referer: `${NETNUTRITION_BASE}#`,
            cookie: cookieHeader(this.cookieJar),
          },
          body: form.toString(),
        });
        const text = await res.text();
        parseSetCookie(res.headers, this.cookieJar);
        this.ensureExternalCookie();
        this.refreshHiddenFields(text);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (isStartupError(text)) {
          console.warn(`Startup error on ${path}; refreshing session and retrying`);
          await this.initSession();
          throw new Error('Startup error from NetNutrition');
        }
        return text;
      } catch (e) {
        lastErr = e;
        console.error(`POST ${path} failed retry ${i}/${RETRIES}`, e);
        if (i < RETRIES) {
          await new Promise((r) => setTimeout(r, i * 200));
          if (String(e).includes('Startup error')) await this.initSession();
        }
      }
    }
    throw new Error(`POST ${path} failed after retries: ${String(lastErr)}`);
  }
  async selectUnitFromSidebar(unitId: string) { return parsePanelResponse(await this.postWithRetry('Unit/SelectUnitFromSideBar', { unitOid: unitId, selectedUnitOid: unitId })); }
  async selectChildUnit(unitId: string) { return parsePanelResponse(await this.postWithRetry('Unit/SelectUnitFromChildUnitsList', { unitOid: unitId, childUnitOid: unitId })); }
  async selectMenu(menuId: string) { return parsePanelResponse(await this.postWithRetry('Menu/SelectMenu', { menuOid: menuId, selectedMenuOid: menuId })); }
  async nutritionForItem(itemId: string, menuId?: string) { const response = parsePanelResponse(await this.postWithRetry('NutritionDetail/ShowItemNutritionLabel', { detailOid: itemId, ...(menuId ? { menuOid: menuId } : {}) })); const html = response.html || response.mergedHtml; return parseNutritionLabel(html); }
}

async function readCachedResponse(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<MenuResponse | null> {
  const { data: md } = await supabase.from('metadata').select('last_updated').limit(1);
  const last_updated = md?.[0]?.last_updated ?? null;
  const { data: halls, error: hErr } = await supabase.from('dining_halls').select('id,name').order('name'); if (hErr || !halls) return null;
  const { data: cats, error: cErr } = await supabase.from('menu_categories').select('id,hall_id,name').order('name'); if (cErr || !cats) return null;
  const { data: items, error: iErr } = await supabase.from('food_items').select('id,category_id,name').order('name'); if (iErr || !items) return null;
  const { data: facts, error: fErr } = await supabase.from('nutrition_facts').select('item_id,calories,protein,carbs,fat'); if (fErr || !facts) return null;
  const factsMap = new Map(facts.map((f) => [f.item_id, f]));
  return {
    halls: halls.map((hall) => ({
      name: hall.name,
      categories: cats.filter((c) => c.hall_id === hall.id).map((c) => ({
        name: c.name,
        items: items.filter((i) => i.category_id === c.id).map((item) => ({ name: item.name, calories: factsMap.get(item.id)?.calories ?? null, protein: factsMap.get(item.id)?.protein ?? null, carbs: factsMap.get(item.id)?.carbs ?? null, fat: factsMap.get(item.id)?.fat ?? null })),
      })),
    })),
    last_updated,
  };
}

const isCacheFresh = (lastUpdated: string | null) => !!lastUpdated && (Date.now() - new Date(lastUpdated).getTime() < CACHE_MAX_AGE_MS);

async function upsertScrapeData(supabase: ReturnType<typeof getSupabaseAdmin>, halls: ScrapeHall[], updatedAt: string) {
  const hallRows = halls.map((h) => ({ id: h.id, name: h.name }));
  const catRows = halls.flatMap((h) => h.categories.map((c) => ({ id: c.id, hall_id: c.hallId, name: c.name })));
  const itemRows = halls.flatMap((h) => h.categories.flatMap((c) => c.items.map((i) => ({
    id: i.id,
    category_id: c.id,
    name: i.name,
    allergens: i.allergens ?? [],
    dietary_flags: i.dietaryFlags ?? [],
  }))));
  const factRows = halls.flatMap((h) => h.categories.flatMap((c) => c.items.map((i) => ({ id: `nf_${i.id}`, item_id: i.id, calories: i.calories, protein: i.protein, carbs: i.carbs, fat: i.fat, raw_label_json: i.rawLabel }))));
  if (hallRows.length) { const { error } = await supabase.from('dining_halls').upsert(hallRows, { onConflict: 'id' }); if (error) throw error; }
  if (catRows.length) { const { error } = await supabase.from('menu_categories').upsert(catRows, { onConflict: 'id' }); if (error) throw error; }
  if (itemRows.length) { const { error } = await supabase.from('food_items').upsert(itemRows, { onConflict: 'id' }); if (error) throw error; }
  if (factRows.length) { const { error } = await supabase.from('nutrition_facts').upsert(factRows, { onConflict: 'id' }); if (error) throw error; }
  const { error: mErr } = await supabase.from('metadata').upsert({ id: 1, last_updated: updatedAt }, { onConflict: 'id' }); if (mErr) throw mErr;
}

function asMenuResponse(halls: ScrapeHall[], last_updated: string): MenuResponse { return { halls: halls.map((h) => ({ name: h.name, categories: h.categories.map((c) => ({ name: c.name, items: c.items.map((i) => ({ name: i.name, calories: i.calories, protein: i.protein, carbs: i.carbs, fat: i.fat })) })) })), last_updated }; }

async function scrapeAllHalls(): Promise<ScrapeHall[]> {
  const client = new NetNutritionClient(); const { units } = await client.getHomepage(); const halls: ScrapeHall[] = [];
  for (const unit of units) {
    let state = await client.selectUnitFromSidebar(unit.id);
    let hops = 0;
    while (state.panelType === 'childUnitsPanel' && hops++ < 20) {
      const children = parseChildUnits(state.html || state.mergedHtml); if (!children.length) throw new Error(`No child units for ${unit.name}; htmlSnippet=${(state.html || state.mergedHtml).slice(0, 180)}`);
      let nextState: ReturnType<typeof parsePanelResponse> | null = null;
      for (const child of children) {
        const candidate = await client.selectChildUnit(child.id);
        if (candidate.panelType === 'menuPanel' || candidate.panelType === 'itemPanel' || candidate.panelType === 'childUnitsPanel') {
          nextState = candidate;
          if (candidate.panelType !== 'childUnitsPanel') break;
        }
      }
      if (!nextState) throw new Error(`Unable to select child unit for ${unit.name}`);
      state = nextState;
    }
    const categories: ScrapeCategory[] = [];
    if (state.panelType === 'menuPanel') {
      for (const menu of parseMenus(state.html || state.mergedHtml)) {
        const menuState = await client.selectMenu(menu.id); const items = parseItems(menuState.html || menuState.mergedHtml);
        const category: ScrapeCategory = { id: `menu_${menu.id}`, hallId: unit.id, name: menu.name, items: [] };
        for (const item of items) {
          const nutrition = await client.nutritionForItem(item.id, menu.id);
          category.items.push({ id: `item_${item.id}`, name: item.name, calories: nutrition.calories, protein: nutrition.protein, carbs: nutrition.carbs, fat: nutrition.fat, rawLabel: nutrition.raw });
        }
        categories.push(category);
      }
    } else if (state.panelType === 'itemPanel') {
      const stationCategories = parseStationCategoriesFromItemPanel(state.html || state.mergedHtml);
      if (stationCategories.length) {
        for (const [index, stationCategory] of stationCategories.entries()) {
          const category: ScrapeCategory = {
            id: `menu_${unit.id}_${index + 1}`,
            hallId: unit.id,
            name: stationCategory.name,
            items: [],
          };
          for (const item of stationCategory.items) {
            if (!item.detailOid) continue;
            const nutrition = await client.nutritionForItem(item.detailOid);
            category.items.push({
              id: `item_${item.id}`,
              name: item.name,
              calories: nutrition.calories,
              protein: nutrition.protein,
              carbs: nutrition.carbs,
              fat: nutrition.fat,
              allergens: item.allergens,
              dietaryFlags: item.dietaryFlags,
              rawLabel: {
                ...nutrition.raw,
                serving_size: item.servingSize,
                detail_oid: item.detailOid,
              },
            });
          }
          if (category.items.length) categories.push(category);
        }
      } else {
        const category: ScrapeCategory = { id: `menu_${unit.id}_default`, hallId: unit.id, name: 'All Items', items: [] };
        for (const item of parseItems(state.html || state.mergedHtml)) {
          const nutrition = await client.nutritionForItem(item.id);
          category.items.push({ id: `item_${item.id}`, name: item.name, calories: nutrition.calories, protein: nutrition.protein, carbs: nutrition.carbs, fat: nutrition.fat, rawLabel: nutrition.raw });
        }
        categories.push(category);
      }
    } else {
      throw new Error(`Could not reach menuPanel/itemPanel for ${unit.name}`);
    }
    halls.push({ id: unit.id, name: unit.name, categories });
  }
  return halls;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'content-type': 'application/json' } });

  const supabase = getSupabaseAdmin();
  const cached = await readCachedResponse(supabase);
  if (cached && isCacheFresh(cached.last_updated)) return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, 'content-type': 'application/json' } });

  try {
    const halls = await scrapeAllHalls();
    const updatedAt = new Date().toISOString();
    await upsertScrapeData(supabase, halls, updatedAt);
    return new Response(JSON.stringify(asMenuResponse(halls, updatedAt)), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
  } catch (error) {
    console.error('Scrape failed; falling back to cache', error);
    if (cached) return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
    return new Response(JSON.stringify({ error: 'Scrape failed and cache missing' }), { status: 502, headers: { ...corsHeaders, 'content-type': 'application/json' } });
  }
});
