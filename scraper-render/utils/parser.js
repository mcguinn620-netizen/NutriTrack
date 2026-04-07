import { chromium } from 'playwright';

const DEFAULT_TIMEOUT_MS = Number(process.env.SCRAPER_TIMEOUT_MS || 45_000);

/**
 * Convert a table-like data structure into an object keyed by nutrient name.
 */
function normalizeNutritionRows(rawRows = []) {
  const nutrition = {};

  for (const row of rawRows) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const [key, value] = row;
    const nutrient = String(key || '').replace(/\s+/g, ' ').trim();
    const amount = String(value || '').replace(/\s+/g, ' ').trim();

    if (!nutrient || !amount) continue;
    nutrition[nutrient] = amount;
  }

  return nutrition;
}

/**
 * Scrape the current NetNutrition DOM into normalized JSON.
 * Works across common ASP.NET NetNutrition layouts.
 */
export async function scrapeNetNutrition({
  url,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  logger = console,
} = {}) {
  if (!url) {
    throw new Error('Missing required scrape URL');
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 2200 },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);

  try {
    logger.info('[scraper] Navigating to NetNutrition URL:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, 15_000) }).catch(() => {
      logger.warn('[scraper] networkidle not reached; continuing with current DOM');
    });

    const extracted = await page.evaluate(() => {
      const text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();
      const dedupe = (arr) => [...new Set(arr.filter(Boolean))];

      const readDiningUnits = () => {
        const selectors = [
          'select[id*="Dining"] option',
          'select[id*="Unit"] option',
          '#cboDiningUnit option',
          '.cboDiningUnit option',
          '[data-testid*="dining"] option',
          '.dining-hall, .dining-unit, .location-card',
        ];

        const values = selectors.flatMap((selector) =>
          Array.from(document.querySelectorAll(selector)).map((el) => text(el))
        );

        return dedupe(values).filter((value) => !/^select/i.test(value));
      };

      const readMenus = () => {
        const selectors = [
          'select[id*="Meal"] option',
          'select[id*="Menu"] option',
          '#cboMeal option',
          '.meal-name, .menu-name, .menu-header, .meal-header',
          '.menu-tabs a, .meal-tabs a',
        ];

        const values = selectors.flatMap((selector) =>
          Array.from(document.querySelectorAll(selector)).map((el) => text(el))
        );

        return dedupe(values).filter((value) => !/^select/i.test(value));
      };

      const parseNutritionFromRow = (row) => {
        const cells = Array.from(row.querySelectorAll('td, th')).map((cell) => text(cell));
        if (cells.length >= 2) return cells.slice(0, 2);

        const key = text(row.querySelector('[class*="nutrient"], [class*="name"], strong'));
        const value = text(row.querySelector('[class*="value"], [class*="amount"], span:last-child'));
        return key && value ? [key, value] : null;
      };

      const itemNodes = Array.from(
        document.querySelectorAll(
          '.food-item, .menu-item, .item, .nn-item, li, tr, .cbo_nn_item, .ItemName'
        )
      );

      const items = itemNodes
        .map((node) => {
          const name =
            text(node.querySelector('.item-name, .food-name, .menu-item-name, a, strong')) ||
            text(node.querySelector('td:first-child')) ||
            text(node);

          if (!name || name.length > 160) {
            return null;
          }

          const nutritionRows = Array.from(
            node.querySelectorAll(
              'table tr, .nutrition tr, .nutrition-table tr, .nutrients tr, .fact-row'
            )
          )
            .map((row) => parseNutritionFromRow(row))
            .filter(Boolean);

          const macros = [
            ['Calories', text(node.querySelector('[class*="calorie"], [data-nutrient="calories"]'))],
            ['Protein', text(node.querySelector('[class*="protein"], [data-nutrient="protein"]'))],
            ['Carbohydrates', text(node.querySelector('[class*="carb"], [data-nutrient="carbs"]'))],
            ['Fat', text(node.querySelector('[class*="fat"], [data-nutrient="fat"]'))],
          ].filter(([, v]) => Boolean(v));

          return {
            name,
            nutritionRows: nutritionRows.length ? nutritionRows : macros,
          };
        })
        .filter(Boolean);

      return {
        scrapedAt: new Date().toISOString(),
        source: window.location.href,
        diningUnits: readDiningUnits(),
        menus: readMenus(),
        items,
      };
    });

    const normalizedItems = extracted.items.map((item) => ({
      name: item.name,
      nutrition: normalizeNutritionRows(item.nutritionRows),
    }));

    const payload = {
      scrapedAt: extracted.scrapedAt,
      source: extracted.source,
      diningUnits: extracted.diningUnits,
      menus: extracted.menus,
      items: normalizedItems,
      stats: {
        diningUnitCount: extracted.diningUnits.length,
        menuCount: extracted.menus.length,
        itemCount: normalizedItems.length,
      },
    };

    logger.info(
      `[scraper] Complete. diningUnits=${payload.stats.diningUnitCount}, menus=${payload.stats.menuCount}, items=${payload.stats.itemCount}`
    );

    return payload;
  } catch (error) {
    logger.error('[scraper] Failed:', error);
    throw error;
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}
