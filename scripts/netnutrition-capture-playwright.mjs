#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const NETNUTRITION_URL = process.env.NETNUTRITION_URL ?? 'https://netnutrition.bsu.edu/NetNutrition/1';
const OUT_DIR = process.env.NETNUTRITION_CAPTURE_DIR ?? path.join(process.cwd(), 'artifacts', 'netnutrition-capture', new Date().toISOString().replace(/[:.]/g, '-'));

const TARGET_PATTERNS = [
  /Menu\/ToggleCourseItems/i,
  /UpdateNavBar/i,
  /Menu\/SelectMenu/i,
  /Unit\/SelectUnit/i,
];

const ID_PATTERNS = [
  /courseOid/i,
  /course0id/i,
  /courseId/i,
  /CourseOid/i,
  /CourseID/i,
];

function pickHeaders(headers) {
  const keep = ['content-type', 'x-requested-with', 'origin', 'referer', 'cookie'];
  return Object.fromEntries(Object.entries(headers).filter(([k]) => keep.includes(k.toLowerCase())));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2), 'utf8');
}

function findIdentifierMatches(text) {
  const matches = [];
  for (const pattern of ID_PATTERNS) {
    if (pattern.test(text)) matches.push(pattern.source.replace(/\\/g, ''));
  }
  return [...new Set(matches)];
}

async function run() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (error) {
    console.error('Missing playwright dependency. Install with: npm i -D playwright');
    throw error;
  }

  const browser = await chromium.launch({ headless: process.env.HEADLESS !== 'false' });
  const context = await browser.newContext();
  const page = await context.newPage();

  await fs.mkdir(OUT_DIR, { recursive: true });
  const requestLog = [];
  const responseLog = [];

  page.on('request', async (request) => {
    const url = request.url();
    if (!TARGET_PATTERNS.some((rx) => rx.test(url))) return;

    const entry = {
      at: new Date().toISOString(),
      url,
      method: request.method(),
      headers: pickHeaders(request.headers()),
      postData: request.postData() ?? null,
      postDataJson: request.postDataJSON?.() ?? null,
      identifierHints: findIdentifierMatches((request.postData() ?? '') + url),
    };
    requestLog.push(entry);
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (!TARGET_PATTERNS.some((rx) => rx.test(url))) return;

    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch {
      bodyText = '<unavailable>';
    }

    const entry = {
      at: new Date().toISOString(),
      url,
      status: response.status(),
      headers: pickHeaders(response.headers()),
      identifierHints: findIdentifierMatches(bodyText),
      bodyPreview: bodyText.slice(0, 4000),
    };

    responseLog.push(entry);

    const safeName = url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 140);
    await fs.writeFile(path.join(OUT_DIR, 'responses', `${Date.now()}_${safeName}.txt`), bodyText, 'utf8');
  });

  await page.goto(NETNUTRITION_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1500);

  const preDom = await page.content();
  await fs.writeFile(path.join(OUT_DIR, 'page-before-click.html'), preDom, 'utf8');

  // Session-first flow: select first visible unit/station menu candidate.
  // We intentionally use broad selectors because NetNutrition markup varies by school setup.
  const clickedFlow = await page.evaluate(async () => {
    const actions = [];

    const clickFirst = (selectorList) => {
      for (const sel of selectorList) {
        const nodes = Array.from(document.querySelectorAll(sel));
        const node = nodes.find((el) => {
          const text = (el.textContent || '').trim();
          return !!text && !/home|sign in|my meals/i.test(text);
        });
        if (node) {
          node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          actions.push({ selector: sel, text: (node.textContent || '').trim().slice(0, 120) });
          return true;
        }
      }
      return false;
    };

    clickFirst(['#sidebarUnitList a', '#unitsPanel a', 'a[onclick*="SelectUnit"]']);
    await new Promise((r) => setTimeout(r, 1200));

    clickFirst(['#menuListPanel a', 'a[onclick*="SelectMenu"]', 'a[onclick*="menuListSelectMenu"]']);
    await new Promise((r) => setTimeout(r, 1200));

    const toggles = Array.from(document.querySelectorAll('a,button,div,span')).filter((el) => {
      const onclick = el.getAttribute('onclick') || '';
      const data = [onclick, el.id || '', el.className || '', el.getAttribute('data-course-id') || '', el.getAttribute('data-course-oid') || ''].join(' ');
      return /ToggleCourseItems|courseOid|courseId/i.test(data);
    });

    let clickedCategory = null;
    if (toggles.length) {
      const node = toggles[0];
      clickedCategory = {
        outerHTML: node.outerHTML,
        text: (node.textContent || '').trim().slice(0, 200),
      };
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      actions.push({ selector: 'heuristic-toggle', text: clickedCategory.text });
    }

    return { actions, clickedCategory, toggleCount: toggles.length };
  });

  await page.waitForTimeout(2500);

  const postDom = await page.content();
  await fs.writeFile(path.join(OUT_DIR, 'page-after-click.html'), postDom, 'utf8');
  await writeJson(path.join(OUT_DIR, 'clicked-category-dom.json'), clickedFlow);
  await writeJson(path.join(OUT_DIR, 'network-requests.json'), requestLog);
  await writeJson(path.join(OUT_DIR, 'network-responses.json'), responseLog);

  const relevantRequests = requestLog.filter((r) => /ToggleCourseItems/i.test(r.url));
  const relevantResponses = responseLog.filter((r) => /ToggleCourseItems/i.test(r.url));
  await writeJson(path.join(OUT_DIR, 'togglecourseitems-requests.json'), relevantRequests);
  await writeJson(path.join(OUT_DIR, 'togglecourseitems-responses.json'), relevantResponses);

  const updateNavResponses = responseLog.filter((r) => /UpdateNavBar/i.test(r.url));
  await writeJson(path.join(OUT_DIR, 'updatenavbar-responses.json'), updateNavResponses);

  console.log(`Capture complete: ${OUT_DIR}`);
  console.log(`ToggleCourseItems requests: ${relevantRequests.length}`);
  console.log(`ToggleCourseItems responses: ${relevantResponses.length}`);
  console.log(`UpdateNavBar responses: ${updateNavResponses.length}`);

  await browser.close();
}

run().catch((error) => {
  console.error('Reverse engineering capture failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
