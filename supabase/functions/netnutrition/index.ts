/**
 * NetNutrition Edge Function — BSU CBORD NetNutrition Proxy
 *
 * API protocol reverse-engineered from CBORD_NN_UI.js:
 *  - All AJAX POSTs return JSON:  { success: bool, panels: [{id, html}] }
 *    or on error:                 { success: false, errorID, errorHTML }
 *  - Unit list lives in the initial page HTML (GET /NetNutrition/1/)
 *  - Selecting a unit → POST Unit/SelectUnitFromUnitsList → panels with menu list
 *  - Selecting a menu → POST Menu/SelectMenu            → panels with item grid
 *  - Nutrition label  → POST NutritionDetail/ShowItemNutritionLabel
 */

import { corsHeaders } from '../_shared/cors.ts';

const BASE = 'http://netnutrition.bsu.edu/NetNutrition/1';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Cookie helpers ────────────────────────────────────────────────────────────

function extractCookies(res: Response, existing = ''): string {
  const map = new Map<string, string>();
  for (const pair of existing.split('; ')) {
    const eq = pair.indexOf('=');
    if (eq > 0) map.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
  }
  try {
    const all: string[] =
      typeof (res.headers as any).getSetCookie === 'function'
        ? (res.headers as any).getSetCookie()
        : res.headers.get('set-cookie')
        ? [res.headers.get('set-cookie') as string]
        : [];
    for (const c of all) {
      const part = c.split(';')[0];
      const eq = part.indexOf('=');
      if (eq > 0) map.set(part.slice(0, eq).trim(), part.slice(eq + 1));
    }
  } catch {
    const h = res.headers.get('set-cookie');
    if (h) {
      const part = h.split(';')[0];
      const eq = part.indexOf('=');
      if (eq > 0) map.set(part.slice(0, eq).trim(), part.slice(eq + 1));
    }
  }
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

/** GET the main page — returns page HTML + session cookie */
async function nn_get_page(): Promise<{ html: string; cookie: string }> {
  const res = await fetch(`${BASE}/`, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });
  const cookie = extractCookies(res);
  const html = await res.text();
  console.log(
    `[nn_get_page] status=${res.status} cookie=${cookie.slice(0, 60)} htmlLen=${html.length}`,
  );
  return { html, cookie };
}

/**
 * POST to a CBORD NetNutrition endpoint.
 * Returns raw response text (usually JSON) + updated cookie.
 */
async function nn_post(
  path: string,
  body: Record<string, string>,
  cookie: string,
): Promise<{ text: string; cookie: string; status: number }> {
  // Always non-empty body to satisfy HTTP 411
  const bodyStr =
    Object.keys(body).length > 0
      ? new URLSearchParams(body).toString()
      : 'nocache=1';

  const res = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Content-Length': String(new TextEncoder().encode(bodyStr).length),
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': cookie,
      'Referer': `${BASE}/`,
      'Origin': 'http://netnutrition.bsu.edu',
    },
    body: bodyStr,
  });
  const newCookie = extractCookies(res, cookie);
  const text = await res.text();
  console.log(`[nn_post] ${path} → status=${res.status} len=${text.length}`);
  if (text.length < 500) console.log(`[nn_post] body snippet: ${text}`);
  return { text, cookie: newCookie, status: res.status };
}

// ── CBORD response parser ─────────────────────────────────────────────────────

interface CbordPanel {
  id: string;
  html: string;
}

interface CbordResponse {
  success: boolean;
  panels?: CbordPanel[];
  errorID?: string;
  errorHTML?: string;
}

/**
 * Parse a CBORD renderResponse JSON payload.
 * Returns a map of panelId → html for all non-empty panels.
 */
function parseCbordResponse(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  const trimmed = raw.trim();
  if (!trimmed) return map;

  // Try JSON parse first (expected format)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data: CbordResponse = JSON.parse(trimmed);
      if (data.success && data.panels) {
        for (const panel of data.panels) {
          if (panel.html && panel.html.length > 0) {
            map.set(panel.id, panel.html);
          }
        }
      }
      return map;
    } catch {
      // fall through to plain HTML treatment
    }
  }

  // If it's plain HTML (e.g. session timeout returned full page), treat as 'raw'
  map.set('__raw__', trimmed);
  return map;
}

/** Extract all panel HTML concatenated into one string for parsing */
function getPanelHtml(panels: Map<string, string>, ...preferIds: string[]): string {
  for (const id of preferIds) {
    const h = panels.get(id);
    if (h) return h;
  }
  // fallback: join all panels
  return Array.from(panels.values()).join('\n');
}

function truncateForLog(value: string, max = 12000): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}… [truncated ${value.length - max} chars]`;
}

// ── String utilities ──────────────────────────────────────────────────────────

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function num(s: string): number {
  const m = (s || '').replace(/,/g, '').match(/[\d.]+/);
  return m ? Math.round(parseFloat(m[0])) : 0;
}

// ── Parsers ───────────────────────────────────────────────────────────────────

/**
 * Parse unit (dining location) entries from page HTML.
 * CBORD_NN_UI.js uses:  unitsSelectUnit(OID), sideBarSelectUnit(OID), unitTreeSelectUnit(OID)
 * HTML patterns seen:   onclick="unitsSelectUnit(123)"  or  onclick="sideBarSelectUnit(123)"
 */
function parseUnits(html: string): Array<{ oid: number; name: string }> {
  const result: Array<{ oid: number; name: string }> = [];
  const seen = new Set<number>();

  // Patterns from CBORD_NN_UI.js function names.
  // Function calls can appear in onclick and/or href attributes.
  const fnGroup = '(?:unitsSelectUnit|sideBarSelectUnit|unitTreeSelectUnit|childUnitsSelectUnit)';

  // Match clickable tags that invoke one of the known unit-selection functions.
  const re = new RegExp(
    `<(?:a|button|li|td|div)[^>]{0,800}(?:onclick|href)\\s*=\\s*["'][^"']*${fnGroup}\\((\\d+)\\)[^"']*["'][^>]*>([\\s\\S]{1,600}?)<\\/(?:a|button|li|td|div)>`,
    'gi',
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const oid = parseInt(m[1]);
    if (seen.has(oid)) continue;
    const name = decode(m[2]);
    if (name.length > 1 && name.length < 100) {
      result.push({ oid, name });
      seen.add(oid);
    }
  }

  // Secondary: id="unitOid_X" pattern (some versions use this)
  if (result.length === 0) {
    const re2 = /id="unitOid_(\d+)"[^>]*>([\s\S]{1,300}?)(?=id="unitOid_\d+"|<\/ul>|$)/gi;
    let m2: RegExpExecArray | null;
    while ((m2 = re2.exec(html)) !== null) {
      const oid = parseInt(m2[1]);
      if (seen.has(oid)) continue;
      const name = decode(m2[2]);
      if (name.length > 1 && name.length < 100) {
        result.push({ oid, name });
        seen.add(oid);
      }
    }
  }

  // Last resort: collect raw OIDs from function calls so unit flows can still proceed.
  if (result.length === 0) {
    const re3 = new RegExp(`${fnGroup}\\((\\d+)\\)`, 'gi');
    let m3: RegExpExecArray | null;
    while ((m3 = re3.exec(html)) !== null) {
      const oid = parseInt(m3[1]);
      if (seen.has(oid)) continue;
      result.push({ oid, name: `Unit ${oid}` });
      seen.add(oid);
    }
  }

  return result;
}

/**
 * Parse menu entries from the panel returned after selecting a unit.
 * CBORD_NN_UI.js: menuListSelectMenu(menuOid)
 */
function parseMenus(html: string): Array<{ oid: number; name: string }> {
  const result: Array<{ oid: number; name: string }> = [];
  const seen = new Set<number>();

  const re = /menuListSelectMenu\((\d+)\)['"][^>]*>([\s\S]{1,300}?)<\/(?:a|li|td|div|button)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const oid = parseInt(m[1]);
    if (seen.has(oid)) continue;
    const name = decode(m[2]);
    if (name.length > 1 && name.length < 100) {
      result.push({ oid, name });
      seen.add(oid);
    }
  }
  return result;
}

/**
 * Parse course entries from the panel returned after selecting a menu.
 * CBORD_NN_UI.js: selectCourse(courseOid)
 */
function parseCourses(html: string): Array<{ oid: number; name: string }> {
  const result: Array<{ oid: number; name: string }> = [];
  const seen = new Set<number>();

  const re = /selectCourse\((\d+)\)['"][^>]*>([\s\S]{1,300}?)<\/(?:a|li|td|div|button)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const oid = parseInt(m[1]);
    if (seen.has(oid)) continue;
    const name = decode(m[2]);
    if (name.length > 1 && name.length < 100) {
      result.push({ oid, name });
      seen.add(oid);
    }
  }
  return result;
}

/**
 * Parse items from the item grid panel.
 * CBORD_NN_UI.js: menuDetailGridCb(cbElem, detailOid)
 * Item names live in class="cbo_nn_itemRow" rows with checkboxes id="cbm{oid}"
 */
function parseItems(
  html: string,
): Array<{ oid: number; name: string; serving: string; calories: number }> {
  const result: Array<{
    oid: number;
    name: string;
    serving: string;
    calories: number;
  }> = [];
  const seen = new Set<number>();

  // Pattern A: checkbox id="cbm{oid}" — primary CBORD pattern
  // The checkbox id prefix is MENU_CHECKBOX_PREFIX = 'cbm'
  // The portion select prefix is MENU_PORTION_PREFIX = 'pcm'
  // Structure: <input id="cbm{oid}" ... onchange="menuDetailGridCb(this, {oid})">
  //            nearby: item name in class="cbo_nn_itemPrimaryName" or td text
  const cbRe = /id="cbm(\d+)"[\s\S]{0,600}?(?=id="cbm\d+"|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = cbRe.exec(html)) !== null) {
    const oid = parseInt(m[1]);
    if (seen.has(oid)) continue;
    const block = m[0];

    // Name: try several class patterns
    const nameM =
      block.match(/class="cbo_nn_itemPrimaryName"[^>]*>([\s\S]*?)<\//i) ||
      block.match(/class="[^"]*item[_-]?(?:primary)?[_-]?name[^"]*"[^>]*>([\s\S]*?)<\//i) ||
      block.match(/<td[^>]*class="[^"]*name[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
    const name = nameM ? decode(nameM[1]) : '';
    if (!name) continue;

    // Serving size
    const servM =
      block.match(/class="cbo_nn_itemPortionName"[^>]*>([\s\S]*?)<\//i) ||
      block.match(/class="[^"]*(?:portion|serving)[^"]*"[^>]*>([\s\S]*?)<\//i);
    const serving = servM ? decode(servM[1]) : '1 serving';

    // Calories — typically in a td with just a number
    const calM =
      block.match(/class="[^"]*calories[^"]*"[^>]*>([\s\S]*?)<\//i) ||
      block.match(/<td[^>]*>\s*(\d{2,4})\s*<\/td>/i);
    const calories = calM ? num(decode(calM[1])) : 0;

    result.push({ oid, name, serving, calories });
    seen.add(oid);
  }

  if (result.length > 0) return result;

  // Pattern B: class="cbo_nn_itemRow" table rows
  const rowRe = /class="cbo_nn_itemRow[^"]*"[\s\S]{0,800}?(?=class="cbo_nn_itemRow|<\/tbody>|$)/gi;
  while ((m = rowRe.exec(html)) !== null) {
    const block = m[0];
    // OID from onchange or id
    const oidM =
      block.match(/menuDetailGridCb\(this,\s*(\d+)\)/) ||
      block.match(/detailOid[=:\s'"]+(\d+)/i) ||
      block.match(/id="cbm(\d+)"/i);
    if (!oidM) continue;
    const oid = parseInt(oidM[1]);
    if (seen.has(oid)) continue;

    const nameM =
      block.match(/class="cbo_nn_itemPrimaryName"[^>]*>([\s\S]*?)<\//i) ||
      block.match(/<td[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i);
    const name = nameM ? decode(nameM[1]) : '';
    if (!name) continue;

    const servM = block.match(/class="[^"]*portion[^"]*"[^>]*>([\s\S]*?)<\//i);
    const calM = block.match(/<td[^>]*>\s*(\d{2,4})\s*<\/td>/i);

    result.push({
      oid,
      name,
      serving: servM ? decode(servM[1]) : '1 serving',
      calories: calM ? num(decode(calM[1])) : 0,
    });
    seen.add(oid);
  }

  return result;
}

/**
 * Parse the nutrition label HTML.
 * CBORD renders a standard nutrition facts table; we extract key fields.
 */
function parseNutrition(html: string): Record<string, number | string> {
  const n: Record<string, number | string> = {
    servingSize: '1 serving',
    calories: 0,
    fat: 0,
    saturatedFat: 0,
    transFat: 0,
    cholesterol: 0,
    sodium: 0,
    carbs: 0,
    fiber: 0,
    sugar: 0,
    protein: 0,
  };

  // Table row parsing (most reliable for CBORD labels)
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const cells = [
      ...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi),
    ].map((c) => decode(c[1]));
    if (cells.length < 2) continue;
    const label = cells[0].toLowerCase().replace(/\*/g, '').trim();
    const val = cells[cells.length - 1];

    if (label.includes('serving size') || label.includes('serv. size'))
      n.servingSize = val || n.servingSize;
    else if (label === 'calories' || label === 'total calories')
      n.calories = num(val) || n.calories;
    else if (label.includes('total fat')) n.fat = num(val);
    else if (label.includes('saturated fat') || label.includes('sat. fat'))
      n.saturatedFat = num(val);
    else if (label.includes('trans fat') || label.includes('trans. fat'))
      n.transFat = num(val);
    else if (label.includes('cholesterol')) n.cholesterol = num(val);
    else if (label.includes('sodium')) n.sodium = num(val);
    else if (
      label.includes('total carbohydrate') ||
      label.includes('total carb')
    )
      n.carbs = num(val);
    else if (label.includes('dietary fiber') || label === 'fiber')
      n.fiber = num(val);
    else if (label === 'sugars' || label.includes('total sugar'))
      n.sugar = num(val);
    else if (label === 'protein') n.protein = num(val);
  }

  // ID-based fallbacks (CBORD uses specific label IDs in some versions)
  const idMap: Record<string, string> = {
    lblServingSize: 'servingSize',
    lblCalories: 'calories',
    lblTotalFat: 'fat',
    lblSatFat: 'saturatedFat',
    lblTransFat: 'transFat',
    lblCholesterol: 'cholesterol',
    lblSodium: 'sodium',
    lblTotalCarb: 'carbs',
    lblDietaryFiber: 'fiber',
    lblSugars: 'sugar',
    lblProtein: 'protein',
  };
  for (const [id, key] of Object.entries(idMap)) {
    const re = new RegExp(`id="${id}"[^>]*>([^<]+)<`);
    const hit = html.match(re);
    if (hit) {
      const v = decode(hit[1]);
      if (key === 'servingSize') {
        if (v) n[key] = v;
      } else {
        const parsed = num(v);
        if (parsed > 0) n[key] = parsed;
      }
    }
  }

  return n;
}

// ── Main Deno handler ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, unitOid, menuOid, courseOid, itemOid } = body as {
      action: string;
      unitOid?: number;
      menuOid?: number;
      courseOid?: number;
      itemOid?: number;
    };

    console.log('[netnutrition]', action, { unitOid, menuOid, courseOid, itemOid });

    // ── GET UNITS ──────────────────────────────────────────────────────────────
    if (action === 'units') {
      // Units are rendered in the initial page HTML — no separate API endpoint
      const { html, cookie } = await nn_get_page();

      let units = parseUnits(html);
      console.log(`[units] parsed from initial page: ${units.length}`);

      // If none found in initial page, try the dedicated endpoint as fallback
      if (units.length === 0) {
        console.log('[units] fallback → Unit/GetHtmlUnitEntries');
        const r = await nn_post('Unit/GetHtmlUnitEntries', { nocache: '1' }, cookie);
        console.log(`[units] fallback raw response (len=${r.text.length}):`);
        console.log(truncateForLog(r.text));
        const panels = parseCbordResponse(r.text);
        console.log('[units] fallback panel ids:', Array.from(panels.keys()));
        const panelHtml = getPanelHtml(panels, 'unitsList', 'sideUnitPanel', '__raw__');
        console.log(`[units] fallback panel html (len=${panelHtml.length}):`);
        console.log(truncateForLog(panelHtml));
        units = parseUnits(panelHtml);
        console.log(`[units] fallback parsed: ${units.length}`);
      }

      console.log('[units] final:', JSON.stringify(units));
      return json({ units });
    }

    // ── GET MENUS for a unit ───────────────────────────────────────────────────
    // Returns the list of menus (Breakfast, Lunch, Dinner, etc.) for a unit
    if (action === 'menus') {
      if (!unitOid) return json({ error: 'unitOid required' }, 400);

      // Step 1: Get session
      const { cookie: c0 } = await nn_get_page();

      // Step 2: Select the unit — returns JSON with panels including menu list
      const r1 = await nn_post(
        'Unit/SelectUnitFromUnitsList',
        { unitOid: String(unitOid) },
        c0,
      );
      const panels = parseCbordResponse(r1.text);
      const html = getPanelHtml(
        panels,
        'itemPanel',
        'menuListPanel',
        'unitListPanel',
        '__raw__',
      );

      const menus = parseMenus(html);
      console.log(`[menus] unitOid=${unitOid} → ${menus.length} menus`);
      return json({ menus });
    }

    // ── GET COURSES for a menu ─────────────────────────────────────────────────
    // Returns courses/stations within a menu (e.g. "Entrees", "Sides", "Grill")
    if (action === 'courses') {
      if (!unitOid || !menuOid) return json({ error: 'unitOid and menuOid required' }, 400);

      const { cookie: c0 } = await nn_get_page();

      const r1 = await nn_post(
        'Unit/SelectUnitFromUnitsList',
        { unitOid: String(unitOid) },
        c0,
      );
      const cookie1 = r1.cookie;

      const r2 = await nn_post(
        'Menu/SelectMenu',
        { menuOid: String(menuOid) },
        cookie1,
      );
      const panels = parseCbordResponse(r2.text);
      const html = getPanelHtml(panels, 'itemPanel', 'courseListPanel', '__raw__');

      const courses = parseCourses(html);
      console.log(`[courses] menuOid=${menuOid} → ${courses.length} courses`);
      return json({ courses });
    }

    // ── GET ITEMS for a course/menu ────────────────────────────────────────────
    if (action === 'items') {
      if (!unitOid || !menuOid) {
        return json({ error: 'unitOid and menuOid required' }, 400);
      }

      const { cookie: c0 } = await nn_get_page();

      const r1 = await nn_post(
        'Unit/SelectUnitFromUnitsList',
        { unitOid: String(unitOid) },
        c0,
      );
      const cookie1 = r1.cookie;

      const r2 = await nn_post(
        'Menu/SelectMenu',
        { menuOid: String(menuOid) },
        cookie1,
      );
      const cookie2 = r2.cookie;

      let finalHtml = '';

      if (courseOid) {
        // Select specific course first
        const r3 = await nn_post(
          'Menu/SelectCourse',
          { oid: String(courseOid) },
          cookie2,
        );
        const panels3 = parseCbordResponse(r3.text);
        finalHtml = getPanelHtml(panels3, 'itemPanel', '__raw__');
      } else {
        // No course — items may be directly in the menu panel
        const panels2 = parseCbordResponse(r2.text);
        finalHtml = getPanelHtml(panels2, 'itemPanel', '__raw__');
      }

      const items = parseItems(finalHtml);
      console.log(`[items] menuOid=${menuOid} courseOid=${courseOid} → ${items.length} items`);
      return json({ items });
    }

    // ── GET NUTRITION for an item ─────────────────────────────────────────────
    // Uses NutritionDetail/ShowItemNutritionLabel with POST {detailOid, menuOid}
    if (action === 'nutrition') {
      if (!itemOid) return json({ error: 'itemOid required' }, 400);

      const { cookie: c0 } = await nn_get_page();

      // Try POST ShowItemNutritionLabel first (returns HTML panel fragment)
      const body: Record<string, string> = { detailOid: String(itemOid) };
      if (menuOid) body.menuOid = String(menuOid);

      const r = await nn_post(
        'NutritionDetail/ShowItemNutritionLabel',
        body,
        c0,
      );

      let labelHtml = '';
      const panels = parseCbordResponse(r.text);
      if (panels.size > 0) {
        labelHtml = getPanelHtml(
          panels,
          'nutritionLabelPanel',
          'nutritionLabel',
          '__raw__',
        );
      } else {
        labelHtml = r.text;
      }

      console.log(`[nutrition] itemOid=${itemOid} htmlLen=${labelHtml.length}`);
      const nutrition = parseNutrition(labelHtml);
      return json({ nutrition });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error('[netnutrition] error:', err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
