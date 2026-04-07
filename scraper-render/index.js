const express = require('express');
const { chromium } = require('playwright');

const app = express();
const port = Number(process.env.PORT || 3000);

const DEFAULT_URL = process.env.NETNUTRITION_URL || 'https://netnutrition.bsu.edu/NetNutrition/1';
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'netnutrition-render-scraper' });
});

app.get('/scrape', async (req, res) => {
  const sourceUrl = String(req.query.url || DEFAULT_URL).replace(/#$/, '');

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    await page.goto(sourceUrl, { waitUntil: 'networkidle' });

    const result = await page.evaluate(async () => {
      const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
      const dedupeBy = (arr, keyFn) => {
        const seen = new Set();
        return arr.filter((entry) => {
          const key = keyFn(entry);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
      const clickAndWait = async (el) => {
        el.scrollIntoView({ block: 'center' });
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        await wait();
      };

      const anchors = () => Array.from(document.querySelectorAll('a,button,[onclick]'));
      const parseOid = (text) => {
        const match = String(text || '').match(/(\d{1,10})/);
        return match ? Number(match[1]) : 0;
      };

      const collectByAction = (actions) => {
        const out = anchors()
          .map((node, idx) => {
            const signal = [
              node.getAttribute('onclick') || '',
              node.getAttribute('href') || '',
              node.id || '',
              node.className || '',
            ]
              .join(' ')
              .toLowerCase();

            if (!actions.some((action) => signal.includes(action.toLowerCase()))) return null;
            const name = clean(node.textContent || node.getAttribute('title') || `entry-${idx + 1}`);
            if (!name) return null;

            return {
              oid: parseOid(signal) || idx + 1,
              name,
              signal,
              click: () => clickAndWait(node),
            };
          })
          .filter(Boolean);

        return dedupeBy(out, (entry) => `${entry.oid}:${entry.name}`);
      };

      const collectItems = () => {
        const rows = Array.from(document.querySelectorAll('tr,li,div'));
        const out = rows
          .map((node, idx) => {
            const signal = [
              node.getAttribute('onclick') || '',
              node.getAttribute('href') || '',
              node.className || '',
            ].join(' ');
            if (!/selectitem|showitemnutritionlabel|cbm\d+/i.test(signal)) return null;

            const nameEl =
              node.querySelector('.cbo_nn_itemPrimaryName') ||
              node.querySelector('[class*=itemPrimaryName]') ||
              node.querySelector('a') ||
              node;

            const name = clean(nameEl.textContent);
            if (!name || /^\d+$/.test(name)) return null;

            return {
              oid: parseOid(signal) || idx + 1,
              name,
            };
          })
          .filter(Boolean);

        return dedupeBy(out, (entry) => `${entry.oid}:${entry.name}`);
      };

      const collectTraits = () => collectByAction(['selecttrait']).map(({ oid, name }) => ({ oid, name }));

      const parseNutrition = () => {
        const nutrition = {};
        const rows = Array.from(document.querySelectorAll('tr'));

        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('th,td'));
          if (cells.length < 2) continue;
          const key = clean(cells[0]?.textContent);
          const value = clean(cells[cells.length - 1]?.textContent);
          if (key && value) nutrition[key] = value;
        }

        if (Object.keys(nutrition).length === 0) {
          const text = clean(document.body?.innerText || '');
          text.split(/\n+/).forEach((line) => {
            const [key, ...rest] = line.split(':');
            const k = clean(key);
            const v = clean(rest.join(':'));
            if (k && v) nutrition[k] = v;
          });
        }

        return nutrition;
      };

      const topUnits = collectByAction(['selectunitfromunitslist']);
      const units = [];

      for (const topUnit of topUnits) {
        await topUnit.click();

        let childUnits = collectByAction(['selectunitfromchildunitslist']);
        if (childUnits.length === 0) {
          childUnits = [{ oid: topUnit.oid, name: topUnit.name, click: async () => {} }];
        }

        for (const childUnit of childUnits) {
          await childUnit.click();

          const menus = collectByAction(['selectmenu']);
          const menuPayloads = [];

          for (const menu of menus) {
            await menu.click();

            const traits = collectTraits();
            const items = collectItems();

            const itemPayloads = items.map((item) => ({
              oid: item.oid,
              name: item.name,
              traits: traits.map((trait) => trait.name),
              nutrition: parseNutrition(),
            }));

            menuPayloads.push({
              oid: menu.oid,
              name: menu.name,
              items: itemPayloads,
            });
          }

          units.push({
            oid: childUnit.oid,
            name: childUnit.name,
            menus: menuPayloads,
          });
        }
      }

      return {
        units,
        generatedAt: new Date().toISOString(),
      };
    });

    res.json({
      ...result,
      sourceUrl,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Render scraper failed',
      details: error instanceof Error ? error.message : String(error),
      sourceUrl,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(port, () => {
  console.log(`NetNutrition Render scraper listening on ${port}`);
});
