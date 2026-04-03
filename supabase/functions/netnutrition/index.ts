import { corsHeaders } from '../_shared/cors.ts';

const BASE = 'http://netnutrition.bsu.edu/NetNutrition/1';

// ── Cookie helpers ────────────────────────────────────────────────────────────

function extractCookies(res: Response, existing = ''): string {
  const map = new Map<string, string>();
  // Seed existing cookies
  for (const pair of existing.split('; ')) {
    const eq = pair.indexOf('=');
    if (eq > 0) map.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
  }
  // Absorb new Set-Cookie headers
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
  return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function initSession(): Promise<string> {
  try {
    const res = await fetch(BASE, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
    return extractCookies(res);
  } catch (e) {
    console.error('initSession error:', e);
    return '';
  }
}

async function nn_post(
  path: string,
  body: Record<string, string>,
  cookie: string,
): Promise<{ text: string; cookie: string }> {
  // Always send a non-empty body to satisfy HTTP 411 Length Required
  const bodyStr = Object.keys(body).length > 0
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
      'Referer': BASE,
      'Origin': 'http://netnutrition.bsu.edu',
    },
    body: bodyStr,
  });
  const newCookie = extractCookies(res, cookie);
  const text = await res.text();
  console.log(`[nn_post] ${path} → status ${res.status}, body length ${text.length}`);
  return { text, cookie: newCookie };
}

async function nn_get(
  path: string,
  cookie: string,
): Promise<{ text: string; cookie: string }> {
  const res = await fetch(`${BASE}/${path}`, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/json',
      'Cookie': cookie,
      'Referer': BASE,
    },
  });
  const newCookie = extractCookies(res, cookie);
  const text = await res.text();
  return { text, cookie: newCookie };
}

// ── HTML parsing utilities ────────────────────────────────────────────────────

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function num(s: string): number {
  const m = (s || '').replace(/,/g, '').match(/[\d.]+/);
  return m ? Math.round(parseFloat(m[0])) : 0;
}

/** If the raw string is a JSON object with an `html` property, extract it */
function extractHtml(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const j = JSON.parse(trimmed);
      return j.html || j.HTML || raw;
    } catch { /* not JSON */ }
  }
  return raw;
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseUnits(raw: string): Array<{ oid: number; name: string }> {
  const html = extractHtml(raw);
  const seen = new Set<number>();
  const result: Array<{ oid: number; name: string }> = [];

  // Pattern A: id="unitOid_X"
  const blockRe = /id="unitOid_(\d+)"([^>]*)>([\s\S]*?)(?=id="unitOid_\d+"|<\/ul>|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null) {
    const oid = parseInt(m[1]);
    if (seen.has(oid)) continue;
    const name = decode(m[3]);
    if (name.length > 1 && name.length < 120) { result.push({ oid, name }); seen.add(oid); }
  }
  if (result.length) return result;

  // Pattern B: onclick="…selectUnit(X)…"
  const re2 = /selectUnit\((\d+)\)[^>]*>[\s\S]{0,300}?<\/(?:li|a|span)/gi;
  while ((m = re2.exec(html)) !== null) {
    const oid = parseInt(m[1]);
    if (seen.has(oid)) continue;
    const name = decode(m[0].replace(/selectUnit\(\d+\)[^>]*>/i, ''));
    if (name.length > 1 && name.length < 120) { result.push({ oid, name }); seen.add(oid); }
  }
  return result;
}

function parseCategories(raw: string): Array<{ oid: number; name: string }> {
  const html = extractHtml(raw);
  const seen = new Set<number>();
  const result: Array<{ oid: number; name: string }> = [];

  // Pattern A: id="catOid_X"
  const blockRe = /id="catOid_(\d+)"[^>]*>([\s\S]*?)(?=id="catOid_\d+"|<\/ul>|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null) {
    const oid = parseInt(m[1]);
    if (seen.has(oid)) continue;
    const name = decode(m[2]);
    if (name.length > 1 && name.length < 120) { result.push({ oid, name }); seen.add(oid); }
  }
  if (result.length) return result;

  // Pattern B: selectCategory(X)
  const re2 = /selectCategory\((\d+)\)[^>]*>[\s\S]{0,200}?<\/(?:li|a|span)/gi;
  while ((m = re2.exec(html)) !== null) {
    const oid = parseInt(m[1]);
    if (seen.has(oid)) continue;
    const name = decode(m[0].replace(/selectCategory\(\d+\)[^>]*>/i, ''));
    if (name.length > 1 && name.length < 120) { result.push({ oid, name }); seen.add(oid); }
  }
  return result;
}

function parseItems(raw: string): Array<{ oid: number; name: string; serving: string; calories: number }> {
  const html = extractHtml(raw);
  const seen = new Set<number>();
  const result: Array<{ oid: number; name: string; serving: string; calories: number }> = [];

  // Split on <li items
  const parts = html.split(/(?=<li\b)/i);
  for (const part of parts) {
    const oidM =
      part.match(/showItemNutrition\((\d+)\)/) ||
      part.match(/itemOid[='":\s]+['"]?(\d+)/) ||
      part.match(/id="itemOid_(\d+)"/) ||
      part.match(/detailOid=(\d+)/);
    if (!oidM) continue;
    const oid = parseInt(oidM[1]);
    if (seen.has(oid)) continue;
    seen.add(oid);

    // Name
    const nameM =
      part.match(/class="cbo_nn_item_name"[^>]*>([\s\S]*?)<\//i) ||
      part.match(/class="[^"]*item[_-]?name[^"]*"[^>]*>([\s\S]*?)<\//i) ||
      part.match(/<a[^>]*showItemNutrition[^>]*>([\s\S]*?)<\/a>/i);
    const name = nameM ? decode(nameM[1]) : '';
    if (!name) continue;

    // Serving
    const servM =
      part.match(/class="cbo_nn_item_serving"[^>]*>([\s\S]*?)<\//i) ||
      part.match(/class="[^"]*serving[^"]*"[^>]*>([\s\S]*?)<\//i);
    const serving = servM ? decode(servM[1]) : '1 serving';

    // Calories
    const calM =
      part.match(/class="cbo_nn_item_calories"[^>]*>([\s\S]*?)<\//i) ||
      part.match(/(\d{2,4})\s*(?:cal|kcal)/i);
    const calories = calM ? num(decode(calM[1])) : 0;

    result.push({ oid, name, serving, calories });
  }
  return result;
}

function parseNutrition(raw: string): Record<string, number | string> {
  const html = extractHtml(raw);
  const n: Record<string, number | string> = {
    servingSize: '1 serving', calories: 0, fat: 0, saturatedFat: 0, transFat: 0,
    cholesterol: 0, sodium: 0, carbs: 0, fiber: 0, sugar: 0, protein: 0,
  };

  // Table-row parsing
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => decode(c[1]));
    if (cells.length < 2) continue;
    const label = cells[0].toLowerCase().replace(/\*/g, '').trim();
    const val = cells[cells.length - 1];

    if (label.includes('serving size') || label.includes('serv. size')) n.servingSize = val;
    else if (label === 'calories' || label === 'total calories') n.calories = num(val);
    else if (label.includes('total fat')) n.fat = num(val);
    else if (label.includes('saturated fat') || label.includes('sat. fat')) n.saturatedFat = num(val);
    else if (label.includes('trans fat') || label.includes('trans. fat')) n.transFat = num(val);
    else if (label.includes('cholesterol')) n.cholesterol = num(val);
    else if (label.includes('sodium')) n.sodium = num(val);
    else if (label.includes('total carbohydrate') || label.includes('total carb')) n.carbs = num(val);
    else if (label.includes('dietary fiber') || label === 'fiber') n.fiber = num(val);
    else if (label === 'sugars' || label.includes('total sugar')) n.sugar = num(val);
    else if (label === 'protein') n.protein = num(val);
  }

  // Direct ID-based fallbacks (NetNutrition uses specific element IDs)
  const idMap: Record<string, string> = {
    lblServingSize: 'servingSize', lblCalories: 'calories', lblTotalFat: 'fat',
    lblSatFat: 'saturatedFat', lblTransFat: 'transFat', lblCholesterol: 'cholesterol',
    lblSodium: 'sodium', lblTotalCarb: 'carbs', lblDietaryFiber: 'fiber',
    lblSugars: 'sugar', lblProtein: 'protein',
  };
  for (const [id, key] of Object.entries(idMap)) {
    const idM = html.match(new RegExp(`id="${id}"[^>]*>([^<]+)<`));
    if (idM) {
      const v = decode(idM[1]);
      if (key === 'servingSize') n[key] = v;
      else if (num(v) > 0) n[key] = num(v);
    }
  }

  // Also try span/td patterns with data attributes
  const caloriesM = html.match(/data-value="(\d+)"[^>]*>[\s\S]*?calorie/i)
    || html.match(/id="[^"]*calories[^"]*"[^>]*>(\d+)/i);
  if (caloriesM && !n.calories) n.calories = parseInt(caloriesM[1]);

  return n;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, unitOid, categoryOid, itemOid } = body as {
      action: string; unitOid?: number; categoryOid?: number; itemOid?: number;
    };

    console.log('[netnutrition]', action, { unitOid, categoryOid, itemOid });

    if (action === 'units') {
      const cookie = await initSession();
      const { text } = await nn_post('Unit/GetHtmlUnitEntries', { nocache: '1' }, cookie);
      console.log('[units] raw snippet:', text.slice(0, 300));
      const units = parseUnits(text);
      console.log('[units] parsed:', units.length, 'locations');
      return json({ units });
    }

    if (action === 'categories') {
      if (!unitOid) return json({ error: 'unitOid required' }, 400);
      let cookie = await initSession();
      const r1 = await nn_post('Unit/SelectUnitFromUnitsList', { unitOid: String(unitOid) }, cookie);
      cookie = r1.cookie;
      const r2 = await nn_post('Category/GetHtmlCategoryEntries', { nocache: '1' }, cookie);
      console.log('[categories] raw snippet:', r2.text.slice(0, 300));
      const categories = parseCategories(r2.text);
      console.log('[categories] parsed:', categories.length, 'for unit', unitOid);
      return json({ categories });
    }

    if (action === 'items') {
      if (!unitOid || !categoryOid) return json({ error: 'unitOid and categoryOid required' }, 400);
      let cookie = await initSession();
      const r1 = await nn_post('Unit/SelectUnitFromUnitsList', { unitOid: String(unitOid) }, cookie);
      cookie = r1.cookie;
      const r2 = await nn_post('Category/SelectCategoryFromCategoryList', { categoryOid: String(categoryOid) }, cookie);
      cookie = r2.cookie;
      const r3 = await nn_post('Item/GetHtmlItemEntries', { nocache: '1' }, cookie);
      console.log('[items] raw snippet:', r3.text.slice(0, 300));
      const items = parseItems(r3.text);
      console.log('[items] parsed:', items.length, 'for cat', categoryOid);
      return json({ items });
    }

    if (action === 'nutrition') {
      if (!itemOid) return json({ error: 'itemOid required' }, 400);
      const cookie = await initSession();
      const { text } = await nn_get(
        `ItemNutritionDetail/ShowItemNutritionDetail?detailOid=${itemOid}`,
        cookie,
      );
      console.log('[nutrition] raw snippet:', text.slice(0, 300));
      const nutrition = parseNutrition(text);
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
