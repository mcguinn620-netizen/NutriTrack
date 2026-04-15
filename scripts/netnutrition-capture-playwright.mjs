#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const NETNUTRITION_URL = process.env.NETNUTRITION_URL ?? 'http://netnutrition.bsu.edu/NetNutrition/1#';
const OUT_DIR =
  process.env.NETNUTRITION_CAPTURE_DIR ??
  path.join(process.cwd(), 'artifacts', 'netnutrition-capture', new Date().toISOString().replace(/[:.]/g, '-'));

const MOBILE_VIEWPORT = {
  width: Number.parseInt(process.env.NETNUTRITION_VIEWPORT_WIDTH ?? '390', 10),
  height: Number.parseInt(process.env.NETNUTRITION_VIEWPORT_HEIGHT ?? '844', 10),
};

const MOBILE_USER_AGENT =
  process.env.NETNUTRITION_USER_AGENT ??
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const TARGET_PATTERNS = [
  /Menu\/ToggleCourseItems/i,
  /UpdateNavBar/i,
  /Home\/SetSessionFromLocalData/i,
  /Home\/UpdateNavBar/i,
  /Menu\/SelectMenu/i,
  /Unit\/SelectUnit/i,
  /Unit\/SelectUnitFromSideBar/i,
  /Unit\/SelectUnitFromChildUnitsList/i,
];

const ID_PATTERNS = [/courseOid/i, /course0id/i, /courseId/i, /CourseOid/i, /CourseID/i];

const UNIT_SELECTORS = ['#sidebarUnitList a', '#unitsPanel a', 'a[onclick*="SelectUnit"]'];
const MENU_SELECTORS = ['#menuListPanel a', 'a[onclick*="SelectMenu"]', 'a[onclick*="menuListSelectMenu"]'];
const CATEGORY_SELECTORS = [
  'a[onclick*="ToggleCourseItems"]',
  '[onclick*="courseOid"]',
  '[onclick*="courseId"]',
  '[data-course-id]',
  '[data-course-oid]',
];
const CONTINUE_SELECTORS = [
  'button:has-text("Continue")',
  'a:has-text("Continue")',
  '[role="button"]:has-text("Continue")',
  '#welcomeModal button',
  '.modal button:has-text("Continue")',
  '.modal-footer button',
];

function pickHeaders(headers) {
  const keep = ['content-type', 'x-requested-with', 'origin', 'referer', 'cookie'];
  return Object.fromEntries(Object.entries(headers).filter(([k]) => keep.includes(k.toLowerCase())));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2), 'utf8');
}

async function writeText(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, value, 'utf8');
}

function findIdentifierMatches(text) {
  const matches = [];
  for (const pattern of ID_PATTERNS) {
    if (pattern.test(text)) matches.push(pattern.source.replace(/\\/g, ''));
  }
  return [...new Set(matches)];
}

async function collectPageInfo(page, stage) {
  return page.evaluate((currentStage) => ({
    stage: currentStage,
    at: new Date().toISOString(),
    url: window.location.href,
    bodyClass: document.body?.className ?? '',
    modalOpen: document.body?.classList?.contains('modal-open') ?? false,
    title: document.title,
  }), stage);
}

async function saveSnapshot(page, context, stage, { htmlFileName, cookieFileName } = {}) {
  const htmlPath = path.join(OUT_DIR, htmlFileName ?? `page-${stage}.html`);
  const cookiePath = path.join(OUT_DIR, cookieFileName ?? `cookies-${stage}.json`);
  await writeText(htmlPath, await page.content());
  await writeJson(cookiePath, await context.cookies());
  return collectPageInfo(page, stage);
}

async function countMatches(page, selectors) {
  const counts = {};
  for (const selector of selectors) {
    counts[selector] = await page.locator(selector).count();
  }
  return counts;
}

async function waitForCandidates(page, selectors, stepName, timeoutMs = 20000) {
  const started = Date.now();
  let lastCounts = {};

  while (Date.now() - started < timeoutMs) {
    lastCounts = await countMatches(page, selectors);
    const total = Object.values(lastCounts).reduce((sum, value) => sum + value, 0);
    if (total > 0) {
      return { found: true, counts: lastCounts, elapsedMs: Date.now() - started };
    }
    await page.waitForTimeout(300);
  }

  return { found: false, counts: lastCounts, elapsedMs: Date.now() - started };
}

function isGoodText(text) {
  return !!text && !/home|sign in|my meals/i.test(text);
}

async function clickFirstMatching(page, selectors, stepName) {
  for (const selector of selectors) {
    const locator = page.locator(selector);
    const count = await locator.count();

    for (let i = 0; i < count; i += 1) {
      const candidate = locator.nth(i);
      const meta = await candidate.evaluate((el) => ({
        text: (el.textContent || '').trim(),
        id: el.id || null,
        className: el.className || null,
        href: el.getAttribute('href'),
        onclick: el.getAttribute('onclick'),
        outerHTML: el.outerHTML.slice(0, 1200),
      }));

      if (!isGoodText(meta.text)) continue;

      try {
        await candidate.click({ timeout: 5000 });
        return {
          ok: true,
          method: 'selector',
          stepName,
          selector,
          index: i,
          metadata: meta,
        };
      } catch {
        // try next candidate
      }
    }
  }

  return { ok: false, method: 'selector', stepName };
}

async function clickHeuristic(page, stepName, kind) {
  const metadata = await page.evaluate((currentKind) => {
    const nodePool = Array.from(document.querySelectorAll('a,button,div,span'));
    const matcher = {
      unit: /SelectUnit/i,
      menu: /SelectMenu|menuListSelectMenu/i,
      category: /ToggleCourseItems|courseOid|courseId/i,
      continue: /continue/i,
    }[currentKind];

    const winner = nodePool.find((el) => {
      const text = (el.textContent || '').trim();
      const haystack = [
        text,
        el.id || '',
        el.className || '',
        el.getAttribute('onclick') || '',
        el.getAttribute('data-course-id') || '',
        el.getAttribute('data-course-oid') || '',
      ].join(' ');
      return matcher.test(haystack) && text.length > 0;
    });

    if (!winner) return null;

    winner.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return {
      text: (winner.textContent || '').trim().slice(0, 200),
      id: winner.id || null,
      className: winner.className || null,
      onclick: winner.getAttribute('onclick'),
      outerHTML: winner.outerHTML.slice(0, 1200),
    };
  }, kind);

  if (!metadata) return { ok: false, method: 'heuristic', stepName };
  return { ok: true, method: 'heuristic', stepName, metadata };
}

async function clickContinueIfPresent(page) {
  const modalBefore = await page.evaluate(() => ({
    modalOpen: document.body?.classList?.contains('modal-open') ?? false,
    modalCount: document.querySelectorAll('.modal.show, .modal.in, .modal').length,
  }));

  let result = { ok: false, skipped: false, details: [], modalBefore };

  const candidateWait = await waitForCandidates(page, CONTINUE_SELECTORS, 'continue', 5000);
  if (!candidateWait.found && !modalBefore.modalOpen) {
    result = { ...result, skipped: true, reason: 'continue-not-present' };
    return result;
  }

  const selectorResult = await clickFirstMatching(page, CONTINUE_SELECTORS, 'continue');
  if (selectorResult.ok) {
    result.ok = true;
    result.details.push(selectorResult);
  } else {
    const heuristicResult = await clickHeuristic(page, 'continue', 'continue');
    result.details.push(heuristicResult);
    result.ok = heuristicResult.ok;
  }

  if (result.ok) {
    try {
      await page.waitForLoadState('networkidle', { timeout: 12000 });
    } catch {
      await page.waitForTimeout(1500);
    }
  }

  result.modalAfter = await page.evaluate(() => ({
    modalOpen: document.body?.classList?.contains('modal-open') ?? false,
    modalCount: document.querySelectorAll('.modal.show, .modal.in, .modal').length,
  }));

  return result;
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
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    userAgent: MOBILE_USER_AGENT,
    isMobile: process.env.NETNUTRITION_IS_MOBILE !== 'false',
    hasTouch: process.env.NETNUTRITION_HAS_TOUCH !== 'false',
    deviceScaleFactor: Number.parseFloat(process.env.NETNUTRITION_DEVICE_SCALE_FACTOR ?? '3'),
    locale: process.env.NETNUTRITION_LOCALE ?? 'en-US',
  });
  const page = await context.newPage();

  await fs.mkdir(OUT_DIR, { recursive: true });
  const requestLog = [];
  const responseLog = [];
  const diagnostics = {
    config: {
      NETNUTRITION_URL,
      OUT_DIR,
      MOBILE_VIEWPORT,
      MOBILE_USER_AGENT,
      isMobile: process.env.NETNUTRITION_IS_MOBILE !== 'false',
      hasTouch: process.env.NETNUTRITION_HAS_TOUCH !== 'false',
    },
    steps: [],
    candidateCounts: {},
    clickedNodes: {},
  };

  page.on('request', async (request) => {
    const url = request.url();
    if (!TARGET_PATTERNS.some((rx) => rx.test(url))) return;

    const postData = request.postData() ?? null;
    const entry = {
      at: new Date().toISOString(),
      url,
      method: request.method(),
      headers: pickHeaders(request.headers()),
      postData,
      postDataJson: request.postDataJSON?.() ?? null,
      identifierHints: findIdentifierMatches((postData ?? '') + url),
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
    await writeText(path.join(OUT_DIR, 'responses', `${Date.now()}_${safeName}.txt`), bodyText);
  });

  await page.goto(NETNUTRITION_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => page.waitForTimeout(1500));

  diagnostics.steps.push(
    await saveSnapshot(page, context, 'after-initial-load', {
      htmlFileName: 'page-before-continue.html',
      cookieFileName: 'cookies-after-initial-load.json',
    }),
  );

  const continueResult = await clickContinueIfPresent(page);
  diagnostics.clickedNodes.continue = continueResult;

  diagnostics.steps.push(
    await saveSnapshot(page, context, 'after-continue', {
      htmlFileName: 'page-after-continue.html',
      cookieFileName: 'cookies-after-continue.json',
    }),
  );

  if (continueResult.modalAfter?.modalOpen) {
    console.warn('Welcome modal still appears open after Continue attempts (body.modal-open is still true).');
  }

  const unitWait = await waitForCandidates(page, UNIT_SELECTORS, 'unit-candidates', 20000);
  diagnostics.candidateCounts.unit = unitWait;
  const unitClick = unitWait.found ? await clickFirstMatching(page, UNIT_SELECTORS, 'unit') : { ok: false, skipped: true };
  const unitFallback = !unitClick.ok ? await clickHeuristic(page, 'unit', 'unit') : null;
  diagnostics.clickedNodes.unit = unitClick.ok ? unitClick : unitFallback;

  if (unitClick.ok || unitFallback?.ok) {
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => page.waitForTimeout(1000));
  }

  diagnostics.steps.push(await saveSnapshot(page, context, 'after-unit-selection', { cookieFileName: 'cookies-after-unit-selection.json' }));

  const menuWait = await waitForCandidates(page, MENU_SELECTORS, 'menu-candidates', 20000);
  diagnostics.candidateCounts.menu = menuWait;
  const menuClick = menuWait.found ? await clickFirstMatching(page, MENU_SELECTORS, 'menu') : { ok: false, skipped: true };
  const menuFallback = !menuClick.ok ? await clickHeuristic(page, 'menu', 'menu') : null;
  diagnostics.clickedNodes.menu = menuClick.ok ? menuClick : menuFallback;

  if (menuClick.ok || menuFallback?.ok) {
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => page.waitForTimeout(1000));
  }

  diagnostics.steps.push(await saveSnapshot(page, context, 'after-menu-selection', { cookieFileName: 'cookies-after-menu-selection.json' }));

  const categoryWait = await waitForCandidates(page, CATEGORY_SELECTORS, 'category-candidates', 15000);
  diagnostics.candidateCounts.category = categoryWait;
  const categoryClick = categoryWait.found
    ? await clickFirstMatching(page, CATEGORY_SELECTORS, 'category')
    : { ok: false, skipped: true };
  const categoryFallback = !categoryClick.ok ? await clickHeuristic(page, 'category', 'category') : null;
  diagnostics.clickedNodes.category = categoryClick.ok ? categoryClick : categoryFallback;

  if (categoryClick.ok || categoryFallback?.ok) {
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => page.waitForTimeout(1000));
  }

  diagnostics.steps.push(
    await saveSnapshot(page, context, 'after-category-toggle-attempt', {
      htmlFileName: 'page-after-click.html',
      cookieFileName: 'cookies-after-category-toggle-attempt.json',
    }),
  );

  await writeJson(path.join(OUT_DIR, 'network-requests.json'), requestLog);
  await writeJson(path.join(OUT_DIR, 'network-responses.json'), responseLog);
  await writeJson(path.join(OUT_DIR, 'diagnostics.json'), diagnostics);
  await writeText(path.join(OUT_DIR, 'current-url.txt'), page.url());

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
