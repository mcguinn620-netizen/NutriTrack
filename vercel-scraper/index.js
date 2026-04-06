const { chromium } = require('playwright');

const DEFAULT_SOURCE_URL = 'http://netnutrition.bsu.edu/NetNutrition/1#';

function decodeHtml(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNutritionTable(html = '') {
  const nutrition = {};
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  for (const row of rows) {
    const cellMatches = [...row.matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)];
    const cells = cellMatches
      .map((m) => decodeHtml(m[1].replace(/<[^>]*>/g, '')))
      .filter(Boolean);
    if (cells.length >= 2) {
      nutrition[cells[0]] = cells[cells.length - 1];
    }
  }

  return nutrition;
}

async function scrapeNetNutrition(sourceUrl = DEFAULT_SOURCE_URL) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; BSU-NetNutrition-Vercel-Scraper/1.0)',
  });
  const page = await context.newPage();

  try {
    console.log('[scraper] Opening start URL:', sourceUrl);
    await page.goto(sourceUrl, { waitUntil: 'networkidle', timeout: 90_000 });
    await page.waitForTimeout(1_500);

    const result = await page.evaluate(async () => {
      const normalize = (text = '') =>
        text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const parseAjaxResponse = (raw) => {
        const trimmed = (raw || '').trim();
        if (!trimmed) return { panels: new Map(), fullHtml: '' };

        try {
          const parsed = JSON.parse(trimmed);
          const panels = new Map();
          for (const panel of parsed?.panels || []) {
            if (panel?.id && typeof panel.html === 'string') {
              panels.set(panel.id, panel.html);
            }
          }
          const fullHtml = [...panels.values()].join('\n');
          return {
            panels,
            fullHtml,
            error: parsed?.success === false
              ? `${parsed.errorID || 'unknown'}: ${normalize(parsed.errorHTML || '')}`
              : undefined,
          };
        } catch {
          return { panels: new Map(), fullHtml: trimmed };
        }
      };

      const pickHtml = (parsed, prefer = []) => {
        for (const id of prefer) {
          const html = parsed.panels.get(id);
          if (html) return html;
        }
        return parsed.fullHtml || '';
      };

      const extractOid = (action, fnName) => {
        const regex = new RegExp(`${fnName}\\((\\d+)`);
        const match = action.match(regex);
        return match ? Number(match[1]) : null;
      };

      const parseEntityList = (html, fnNames) => {
        if (!html) return [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const nodes = doc.querySelectorAll('[onclick], a[href], button[onclick], li[onclick], td[onclick], div[onclick]');

        const seen = new Set();
        const entities = [];

        for (const node of nodes) {
          const action = `${node.getAttribute('onclick') || ''} ${node.getAttribute('href') || ''}`;
          for (const fnName of fnNames) {
            const oid = extractOid(action, fnName);
            if (oid == null || seen.has(oid)) continue;

            const name = normalize(node.textContent || '');
            if (!name) continue;
            entities.push({ oid, name });
            seen.add(oid);
          }
        }
        return entities;
      };

      const postAjax = async (endpoint, body) => {
        const payload = new URLSearchParams(
          Object.entries(body).map(([k, v]) => [k, String(v)]),
        ).toString();

        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: payload,
        });

        const text = await resp.text();
        if (!resp.ok) {
          return {
            panels: new Map(),
            fullHtml: '',
            error: `[${resp.status}] ${text.slice(0, 280)}`,
          };
        }

        return parseAjaxResponse(text);
      };

      const postAjaxAny = async (endpoints, body) => {
        let lastError;
        for (const endpoint of endpoints) {
          const parsed = await postAjax(endpoint, body);
          if (!parsed.error) return parsed;
          lastError = parsed.error;
        }
        return { panels: new Map(), fullHtml: '', error: lastError || 'all endpoints failed' };
      };

      await new Promise((resolve) => setTimeout(resolve, 800));

      const initialHtml = document.documentElement.outerHTML;
      const rootUnits = parseEntityList(initialHtml, ['unitsSelectUnit', 'sideBarSelectUnit', 'unitTreeSelectUnit']);

      const allUnits = [];
      const seenUnits = new Set();

      for (const rootUnit of rootUnits) {
        const rootPanel = await postAjax('unit/SelectUnitFromUnitsList', { unitOid: rootUnit.oid });
        const rootHtml = pickHtml(rootPanel, ['menuListPanel', 'itemPanel', 'unitPanel']);

        const childUnits = parseEntityList(rootHtml, ['childUnitsSelectUnit']);
        const unitVariants = [rootUnit, ...childUnits];

        for (const unit of unitVariants) {
          if (seenUnits.has(unit.oid)) continue;
          seenUnits.add(unit.oid);

          const selected = unit.oid === rootUnit.oid
            ? { panels: rootPanel.panels, fullHtml: rootHtml }
            : await postAjax('unit/SelectUnitFromChildUnitsList', { unitOid: unit.oid });

          const menuHostHtml = pickHtml(selected, ['menuListPanel', 'itemPanel', 'unitPanel']);
          const menus = parseEntityList(menuHostHtml, ['menuListSelectMenu']);
          const menuRecords = [];

          for (const menu of menus) {
            const menuPanel = await postAjax('Menu/CourseItems', { menuOid: menu.oid });
            const menuHtml = pickHtml(menuPanel, ['itemPanel', 'menuDetailGridPanel', 'menuPanel']);
            const items = parseEntityList(menuHtml, ['SelectItem']);
            const itemRecords = [];

            for (const item of items) {
              const itemPanel = await postAjax('SelectItem', { detailOid: item.oid, menuOid: menu.oid });
              const itemHtml = pickHtml(itemPanel, ['itemPanel', 'menuDetailGridPanel', 'nutritionLabelPanel']);

              const traits = parseEntityList(itemHtml, ['SelectTrait']);
              for (const trait of traits) {
                await postAjax('SelectTrait', {
                  traitOid: trait.oid,
                  detailOid: item.oid,
                  menuOid: menu.oid,
                });
              }

              const nutritionLabelResp = await postAjaxAny(
                ['ShowItemNutritionLabel', 'NutritionDetail/ShowItemNutritionLabel'],
                { detailOid: item.oid, menuOid: menu.oid },
              );

              const nutritionGridResp = await postAjaxAny(
                ['ShowMenuDetailNutritionGrid', 'NutritionDetail/ShowMenuDetailNutritionGrid'],
                { detailOid: item.oid, menuOid: menu.oid },
              );

              const nutritionLabelHtml = pickHtml(nutritionLabelResp, ['nutritionLabelPanel', 'nutritionLabel', 'itemPanel']);
              const nutritionGridHtml = pickHtml(nutritionGridResp, ['menuDetailNutritionGridPanel', 'nutritionGridPanel', 'itemPanel']);

              itemRecords.push({
                oid: item.oid,
                name: item.name,
                traits,
                nutritionLabel: nutritionLabelHtml,
                nutritionGrid: nutritionGridHtml,
              });
            }

            menuRecords.push({ oid: menu.oid, name: menu.name, items: itemRecords });
          }

          allUnits.push({
            oid: unit.oid,
            name: unit.name,
            source: unit.oid === rootUnit.oid ? 'unit' : 'child-unit',
            menus: menuRecords,
          });
        }
      }

      return {
        units: allUnits,
        generatedAt: new Date().toISOString(),
        sourceUrl: location.href,
      };
    });

    const enriched = {
      ...result,
      units: (result.units || []).map((unit) => ({
        ...unit,
        menus: (unit.menus || []).map((menu) => ({
          ...menu,
          items: (menu.items || []).map((item) => ({
            ...item,
            nutrition: {
              ...parseNutritionTable(item.nutritionLabel || ''),
              ...parseNutritionTable(item.nutritionGrid || ''),
            },
          })),
        })),
      })),
    };

    console.log('[scraper] Done:', {
      units: enriched.units.length,
      menus: enriched.units.reduce((sum, u) => sum + (u.menus?.length || 0), 0),
    });

    return enriched;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end('ok');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const url = typeof req.body?.url === 'string' ? req.body.url : DEFAULT_SOURCE_URL;

  try {
    console.log('[api] Scrape requested for URL:', url);
    const data = await scrapeNetNutrition(url);
    return res.status(200).json(data);
  } catch (error) {
    console.error('[api] Scrape failed:', error);
    return res.status(500).json({
      error: error?.message || 'Scrape failed',
      generatedAt: new Date().toISOString(),
    });
  }
};
