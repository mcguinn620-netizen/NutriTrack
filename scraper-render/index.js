import express from 'express';
import { scrapeNetNutrition } from './utils/parser.js';

const app = express();
const PORT = Number(process.env.PORT || 10000);
const BASE_PATH = '/netnutrition';
const SCRAPE_URL = process.env.NETNUTRITION_URL || 'https://netnutrition.bsu.edu/NetNutrition/1';

app.use(express.json({ limit: '1mb' }));

let cache = {
  data: null,
  updatedAt: null,
};

async function refreshCache() {
  const startedAt = Date.now();
  const data = await scrapeNetNutrition({ url: SCRAPE_URL, logger: console });

  cache = {
    data,
    updatedAt: new Date().toISOString(),
  };

  const elapsedMs = Date.now() - startedAt;
  console.info(`[api] Cache refreshed in ${elapsedMs}ms`);

  return {
    status: 'ok',
    fromCache: false,
    updatedAt: cache.updatedAt,
    elapsedMs,
    ...data,
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'nutritrack-render-scraper', updatedAt: cache.updatedAt });
});

app.get(BASE_PATH, async (_req, res) => {
  try {
    if (cache.data) {
      return res.json({
        status: 'ok',
        fromCache: true,
        updatedAt: cache.updatedAt,
        ...cache.data,
      });
    }

    const fresh = await refreshCache();
    return res.json(fresh);
  } catch (error) {
    console.error('[api] GET /netnutrition failed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Unable to return NetNutrition data',
      details: error?.message || String(error),
    });
  }
});

async function handleScrape(_req, res) {
  try {
    const fresh = await refreshCache();
    return res.json(fresh);
  } catch (error) {
    console.error('[api] POST scrape failed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Scrape failed',
      details: error?.message || String(error),
      cachedAvailable: Boolean(cache.data),
      cachedUpdatedAt: cache.updatedAt,
    });
  }
}

app.post('/scrape', handleScrape);
app.post(`${BASE_PATH}/scrape`, handleScrape);

app.listen(PORT, () => {
  console.info(`[api] NetNutrition scraper listening on port ${PORT}`);
});
