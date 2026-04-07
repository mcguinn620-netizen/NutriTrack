const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DEFAULT_NETNUTRITION_URL = process.env.NETNUTRITION_URL || 'https://netnutrition.bsu.edu/NetNutrition/1';

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumericId(value, fallback) {
  const match = String(value || '').match(/(\d{1,12})/);
  return match ? Number(match[1]) : fallback;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'netnutrition-render-scraper' });
});

app.get('/scrape', async (req, res) => {
  const sourceUrl = String(req.query.url || DEFAULT_NETNUTRITION_URL).replace(/#$/, '');

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();
    page.setDefaultTimeout(45_000);

    await page.goto(sourceUrl, { waitUntil: 'networkidle' });

    const payload = await page.evaluate(async () => {
      const clean = (value) =>
        String(value || '')
          .replace(/\s+/g, ' ')
          .trim();

      const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

      const parseId = (value, fallback = 0) => {
        const match = String(value || '').match(/(\d{1,12})/);
        return match ? Number(match[1]) : fallback;
      };

      const dedupe = (rows, keyFn) => {
        const seen = new Set();
        return rows.filter((row) => {
          const key = keyFn(row);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      const clickableNodes = () => Array.from(document.querySelectorAll('a,button,[onclick]'));

      const clickNode = async (node) => {
        node.scrollIntoView({ block: 'center' });
        node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        await wait(400);
      };

      const collectBySignals = (signals) => {
        const rows = clickableNodes()
          .map((node, index) => {
            const signature = [
              node.getAttribute('onclick') || '',
              node.getAttribute('href') || '',
              node.id || '',
              node.className || '',
            ]
              .join(' ')
              .toLowerCase();

            if (!signals.some((signal) => signature.includes(signal.toLowerCase()))) return null;

            const name = clean(node.textContent || node.getAttribute('title') || '');
            if (!name) return null;

            return {
              id: parseId(signature, index + 1),
              name,
              click: () => clickNode(node),
            };
          })
          .filter(Boolean);

        return dedupe(rows, (row) => `${row.id}:${row.name}`);
      };

      const collectTraits = () =>
        collectBySignals(['selecttrait', 'trait'])
          .map((trait) => ({ id: trait.id, name: trait.name }))
          .filter((trait) => !/^trait$/i.test(trait.name));

      const parseNutritionLabels = () => {
        const labels = {};

        const rowLikeSelectors = ['tr', '.cbo_nn_LabelRow', '.nutrition-row', '.nf-line'];
        const rows = rowLikeSelectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));

        rows.forEach((row) => {
          const cells = Array.from(row.querySelectorAll('th,td,span,div')).map((cell) => clean(cell.textContent));
          const nonEmpty = cells.filter(Boolean);
          if (nonEmpty.length >= 2) {
            const key = nonEmpty[0].replace(/:$/, '');
            const value = nonEmpty[nonEmpty.length - 1];
            if (key && value && key.length < 80 && value.length < 80) {
              labels[key] = value;
            }
          }
        });

        if (Object.keys(labels).length === 0) {
          const text = clean(document.body?.innerText || '');
          text.split(/\n+/).forEach((line) => {
            const [rawKey, ...rest] = line.split(':');
            const key = clean(rawKey);
            const value = clean(rest.join(':'));
            if (key && value && key.length < 80 && value.length < 80) {
              labels[key] = value;
            }
          });
        }

        return labels;
      };

      const collectItems = () => {
        const nodes = Array.from(document.querySelectorAll('tr,li,div,a'));
        const results = nodes
          .map((node, index) => {
            const signature = [
              node.getAttribute('onclick') || '',
              node.getAttribute('href') || '',
              node.id || '',
              node.className || '',
            ].join(' ');

            if (!/selectitem|showitemnutritionlabel|cbm\d+/i.test(signature)) return null;

            const nameNode =
              node.querySelector('.cbo_nn_itemPrimaryName') ||
              node.querySelector('[class*=itemPrimaryName]') ||
              node.querySelector('a') ||
              node;

            const name = clean(nameNode.textContent);
            if (!name || /^\d+$/.test(name)) return null;

            const id = parseId(signature, index + 1);
            return { id, name };
          })
          .filter(Boolean);

        return dedupe(results, (row) => `${row.id}:${row.name}`);
      };

      const topUnits = collectBySignals(['selectunitfromunitslist']);
      const units = [];

      for (const topUnit of topUnits) {
        await topUnit.click();

        let childUnits = collectBySignals(['selectunitfromchildunitslist']);
        if (childUnits.length === 0) {
          childUnits = [{ id: topUnit.id, name: topUnit.name, click: async () => {} }];
        }

        const childUnitPayloads = [];

        for (const childUnit of childUnits) {
          await childUnit.click();

          const menus = collectBySignals(['selectmenu']);
          const menuPayloads = [];

          for (const menu of menus) {
            await menu.click();

            const traits = collectTraits();
            const items = collectItems();

            const itemPayloads = items.map((item) => ({
              id: item.id,
              name: item.name,
              traits,
              nutritionLabels: parseNutritionLabels(),
            }));

            menuPayloads.push({
              id: menu.id,
              name: menu.name,
              items: itemPayloads,
            });
          }

          childUnitPayloads.push({
            id: childUnit.id,
            name: childUnit.name,
            menus: menuPayloads,
          });
        }

        units.push({
          id: topUnit.id,
          name: topUnit.name,
          childUnits: childUnitPayloads,
        });
      }

      return {
        units,
        generatedAt: new Date().toISOString(),
      };
    });

    res.json({
      sourceUrl,
      ...payload,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Render scraper failed',
      details: cleanText(error instanceof Error ? error.message : String(error)),
      sourceUrl,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`NetNutrition Render scraper listening on ${PORT}`);
  console.log(`Default source: ${DEFAULT_NETNUTRITION_URL}`);
});
