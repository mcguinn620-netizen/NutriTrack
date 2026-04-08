import { chromium } from 'playwright';
import { safeGoto } from './safeGoto.js';

const NETNUTRITION_ROOT = 'https://netnutrition.bsu.edu';
const NETNUTRITION_BASE = `${NETNUTRITION_ROOT}/NetNutrition/1`;

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
];

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

const normalizeText = (value = '') => value.replace(/\s+/g, ' ').trim();

const parseNumber = (value = '') => {
  const match = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { __raw: text };
  }
};

const extractHiddenFields = async (page) => {
  return page.evaluate(() => {
    const pick = (name) =>
      document.querySelector(`input[name="${name}"]`)?.getAttribute('value') ?? '';

    return {
      __VIEWSTATE: pick('__VIEWSTATE'),
      __EVENTVALIDATION: pick('__EVENTVALIDATION'),
      __VIEWSTATEGENERATOR: pick('__VIEWSTATEGENERATOR'),
    };
  });
};

const parseUnitsFromHtml = (html) => {
  const out = [];
  const seen = new Set();
  const regex = /(?:sideBarSelectUnit|unitsSelectUnit|unitTreeSelectUnit|childUnitsSelectUnit)\((\d+)\)[\s\S]{0,200}?>\s*([^<]{1,120})\s*</gi;
  for (const m of html.matchAll(regex)) {
    const id = m[1];
    const name = normalizeText(m[2]);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name });
  }
  return out;
};

const parseMenusFromHtml = (html) => {
  const out = [];
  const seen = new Set();
  const regex = /menuListSelectMenu\((\d+)\)[\s\S]{0,200}?>\s*([^<]{1,120})\s*</gi;
  for (const m of html.matchAll(regex)) {
    const id = m[1];
    const name = normalizeText(m[2]);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name });
  }
  return out;
};

const parseItemsFromHtml = (html) => {
  const out = [];
  const seen = new Set();
  const regex = /(?:menuDetailGridCb\(this,\s*|ShowItemNutritionLabel\(|cbm)(\d+)[\s\S]{0,300}?(?:cbo_nn_itemPrimaryName[^>]*>\s*([^<]{1,160})\s*<|>\s*([^<]{1,160})\s*<)/gi;

  for (const m of html.matchAll(regex)) {
    const id = m[1];
    const name = normalizeText(m[2] || m[3] || '');
    if (!id || !name || /^\d+$/.test(name) || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name });
  }

  return out;
};

const parsePanel = (payload) => {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload?.panels)) {
    return payload.panels.map((panel) => panel?.html ?? '').join('\n');
  }
  return payload.__raw || JSON.stringify(payload);
};

const parseNutritionLabel = (html) => {
  const rows = html.matchAll(/<tr[\s\S]*?<\/(?:tr)>/gi);
  let calories = null;
  let protein = null;
  let carbs = null;
  let fat = null;

  for (const rowMatch of rows) {
    const row = rowMatch[0].replace(/<[^>]+>/g, ' ');
    const key = normalizeText(row).toLowerCase();
    const value = parseNumber(row);
    if (value === null) continue;

    if (calories === null && key.includes('calories')) calories = value;
    if (protein === null && key.includes('protein')) protein = value;
    if (carbs === null && (key.includes('carb') || key.includes('carbohydrate'))) carbs = value;
    if (fat === null && key.includes('fat')) fat = value;
  }

  return { calories, protein, carbs, fat };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function scrapeNetNutrition() {
  const browser = await chromium.launch({
    headless: true,
    args: LAUNCH_ARGS,
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; NutriTrack-Render-Scraper/1.0)',
  });
  const page = await context.newPage();

  try {
    await safeGoto(page, `${NETNUTRITION_BASE}#`);
    await page.waitForTimeout(750);

    const hiddenFields = await extractHiddenFields(page);
    const homepageHtml = await page.content();
    const units = parseUnitsFromHtml(homepageHtml);

    const results = [];

    for (const unit of units) {
      const form = new URLSearchParams({
        __VIEWSTATE: hiddenFields.__VIEWSTATE,
        __EVENTVALIDATION: hiddenFields.__EVENTVALIDATION,
        ...(hiddenFields.__VIEWSTATEGENERATOR
          ? { __VIEWSTATEGENERATOR: hiddenFields.__VIEWSTATEGENERATOR }
          : {}),
        unitOid: unit.id,
        selectedUnitOid: unit.id,
      });

      const unitResponse = await context.request.post(
        `${NETNUTRITION_BASE}/Unit/SelectUnitFromSideBar`,
        {
          headers: {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'x-requested-with': 'XMLHttpRequest',
            origin: NETNUTRITION_ROOT,
            referer: `${NETNUTRITION_BASE}#`,
          },
          data: form.toString(),
        },
      );

      const menuPanel = parsePanel(await safeJson(unitResponse));
      const menus = parseMenusFromHtml(menuPanel);
      const menuResults = [];

      for (const menu of menus) {
        const menuForm = new URLSearchParams({
          __VIEWSTATE: hiddenFields.__VIEWSTATE,
          __EVENTVALIDATION: hiddenFields.__EVENTVALIDATION,
          ...(hiddenFields.__VIEWSTATEGENERATOR
            ? { __VIEWSTATEGENERATOR: hiddenFields.__VIEWSTATEGENERATOR }
            : {}),
          menuOid: menu.id,
          selectedMenuOid: menu.id,
        });

        const menuResponse = await context.request.post(`${NETNUTRITION_BASE}/Menu/SelectMenu`, {
          headers: {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'x-requested-with': 'XMLHttpRequest',
            origin: NETNUTRITION_ROOT,
            referer: `${NETNUTRITION_BASE}#`,
          },
          data: menuForm.toString(),
        });

        const itemsPanel = parsePanel(await safeJson(menuResponse));
        const items = parseItemsFromHtml(itemsPanel);
        const itemResults = [];

        for (const item of items) {
          const nutritionForm = new URLSearchParams({
            __VIEWSTATE: hiddenFields.__VIEWSTATE,
            __EVENTVALIDATION: hiddenFields.__EVENTVALIDATION,
            ...(hiddenFields.__VIEWSTATEGENERATOR
              ? { __VIEWSTATEGENERATOR: hiddenFields.__VIEWSTATEGENERATOR }
              : {}),
            detailOid: item.id,
            menuOid: menu.id,
          });

          const nutritionResponse = await context.request.post(
            `${NETNUTRITION_BASE}/NutritionDetail/ShowItemNutritionLabel`,
            {
              headers: {
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'x-requested-with': 'XMLHttpRequest',
                origin: NETNUTRITION_ROOT,
                referer: `${NETNUTRITION_BASE}#`,
              },
              data: nutritionForm.toString(),
            },
          );

          const nutritionPanel = parsePanel(await safeJson(nutritionResponse));
          itemResults.push({
            name: item.name,
            nutrition: parseNutritionLabel(nutritionPanel),
          });

          await sleep(25);
        }

        menuResults.push({
          menu: menu.name,
          items: itemResults,
        });
      }

      results.push({
        dining_hall: unit.name,
        menus: menuResults,
      });
    }

    const menuCount = results.reduce((sum, hall) => sum + hall.menus.length, 0);
    const itemCount = results.reduce(
      (sum, hall) =>
        sum + hall.menus.reduce((inner, menu) => inner + menu.items.length, 0),
      0,
    );

    return {
      source: NETNUTRITION_BASE,
      scraped_at: new Date().toISOString(),
      counts: {
        dining_halls: results.length,
        menus: menuCount,
        items: itemCount,
      },
      data: results,
    };
  } finally {
    await context.close();
    await browser.close();
  }
}
