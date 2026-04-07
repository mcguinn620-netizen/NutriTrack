import express from 'express';
import { chromium } from 'playwright';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DEFAULT_SOURCE_URL = process.env.NETNUTRITION_URL || 'http://netnutrition.bsu.edu/NetNutrition/1';

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const parseNumericId = (value, fallback = 0) => {
  const match = String(value || '').match(/(\d{1,12})/);
  return match ? Number(match[1]) : fallback;
};

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

app.options('/netnutrition', (_req, res) => {
  withCors(res);
  res.status(204).send('');
});

app.get('/health', (_req, res) => {
  withCors(res);
  res.json({ ok: true, service: 'nutritrack-render-scraper' });
});

app.get('/netnutrition', async (req, res) => {
  withCors(res);
  const sourceUrl = cleanText(String(req.query.url || DEFAULT_SOURCE_URL)).replace(/#$/, '');

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
      const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const parseId = (value, fallback = 0) => {
        const match = String(value || '').match(/(\d{1,12})/);
        return match ? Number(match[1]) : fallback;
      };
      const sleep = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

      const dedupe = (rows, keyFn) => {
        const seen = new Set();
        return rows.filter((row) => {
          const key = keyFn(row);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      const clickable = () => Array.from(document.querySelectorAll('a,button,[onclick]'));
      const clickNode = async (node) => {
        node.scrollIntoView({ block: 'center' });
        node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        await sleep(450);
      };

      const collectBySignals = (signals) => {
        const rows = clickable()
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
              oid: parseId(signature, index + 1),
              name,
              click: () => clickNode(node),
            };
          })
          .filter(Boolean);

        return dedupe(rows, (row) => `${row.oid}:${row.name}`);
      };

      const parseNutrition = () => {
        const out = {};
        const rows = Array.from(document.querySelectorAll('tr,.cbo_nn_LabelRow,.nutrition-row,.nf-line'));

        for (const row of rows) {
          const values = Array.from(row.querySelectorAll('th,td,span,div'))
            .map((node) => clean(node.textContent))
            .filter(Boolean);

          if (values.length >= 2) {
            const key = values[0].replace(/:$/, '');
            const value = values[values.length - 1];
            if (key && value && key.length < 80 && value.length < 80) {
              out[key] = value;
            }
          }
        }

        return out;
      };

      const collectItems = () => {
        const nodes = Array.from(document.querySelectorAll('tr,li,div,a'));
        const rows = nodes
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

            const oid = parseId(signature, index + 1);
            return {
              oid,
              name,
              nutrition: parseNutrition(),
            };
          })
          .filter(Boolean);

        return dedupe(rows, (row) => `${row.oid}:${row.name}`);
      };

      const topUnits = collectBySignals(['selectunitfromunitslist']);
      const units = [];

      for (const topUnit of topUnits) {
        await topUnit.click();

        let childUnits = collectBySignals(['selectunitfromchildunitslist']);
        if (childUnits.length === 0) childUnits = [{ ...topUnit, click: async () => {} }];

        for (const childUnit of childUnits) {
          await childUnit.click();

          const menus = collectBySignals(['selectmenu']);
          const menuPayloads = [];
          const flattenedItems = [];

          for (const menu of menus) {
            await menu.click();
            const items = collectItems();
            menuPayloads.push({ oid: menu.oid, name: menu.name, items });
            flattenedItems.push(...items);
          }

          units.push({
            oid: childUnit.oid,
            name: childUnit.name,
            source: childUnit.oid === topUnit.oid ? 'unit' : 'child-unit',
            menus: menuPayloads,
            items: dedupe(flattenedItems, (row) => `${row.oid}:${row.name}`),
          });
        }
      }

      return { units, generatedAt: new Date().toISOString() };
    });

    res.status(200).json({ sourceUrl, ...payload });
  } catch (error) {
    res.status(500).json({
      error: 'Render scraper failed',
      sourceUrl,
      details: cleanText(error instanceof Error ? error.message : String(error)),
    });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`NetNutrition scraper running on port ${PORT}`);
});
