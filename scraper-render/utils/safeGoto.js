const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

const BLOCKED_RESOURCE_TYPES = new Set(['image', 'font', 'stylesheet']);
const ROUTE_FLAG = Symbol('safeGotoRouteInstalled');

async function installRequestOptimizations(page) {
  if (page[ROUTE_FLAG]) return;

  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
      return route.abort();
    }

    return route.continue();
  });

  page[ROUTE_FLAG] = true;
}

export async function safeGoto(page, url) {
  await installRequestOptimizations(page);
  await page.setExtraHTTPHeaders({
    'user-agent': DEFAULT_USER_AGENT,
  });

  const options = {
    waitUntil: 'networkidle',
    timeout: 90_000,
  };

  try {
    return await page.goto(url, options);
  } catch (firstError) {
    console.error('[safeGoto] first navigation attempt failed, retrying once', firstError);
    return page.goto(url, options);
  }
}
