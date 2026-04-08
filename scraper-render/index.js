import express from 'express';
import { scrapeNetNutrition } from './utils/parser.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = Number(process.env.PORT || 3000);
let cachedPayload = null;
let lastError = null;
let inflightScrape = null;

async function runScrape() {
  if (inflightScrape) return inflightScrape;

  inflightScrape = (async () => {
    const started = Date.now();
    try {
      const payload = await scrapeNetNutrition();
      cachedPayload = payload;
      lastError = null;
      const ms = Date.now() - started;
      console.log(
        `[scrape] success halls=${payload.counts.dining_halls} menus=${payload.counts.menus} items=${payload.counts.items} durationMs=${ms}`,
      );
      return payload;
    } catch (error) {
      lastError = {
        message: error instanceof Error ? error.message : String(error),
        at: new Date().toISOString(),
      };
      console.error('[scrape] failed', error);
      throw error;
    } finally {
      inflightScrape = null;
    }
  })();

  return inflightScrape;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, cached: Boolean(cachedPayload), lastError });
});

app.get('/netnutrition', async (_req, res) => {
  try {
    if (!cachedPayload) {
      const fresh = await runScrape();
      return res.status(200).json({
        status: 'fresh',
        ...fresh,
      });
    }

    return res.status(200).json({
      status: 'cached',
      ...cachedPayload,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to load NetNutrition data',
      details: error instanceof Error ? error.message : String(error),
      lastError,
    });
  }
});

app.post(['/scrape', '/netnutrition/scrape'], async (_req, res) => {
  try {
    const fresh = await runScrape();
    return res.status(200).json({
      status: 'fresh',
      ...fresh,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Scrape failed',
      details: error instanceof Error ? error.message : String(error),
      lastError,
    });
  }
});

app.listen(PORT, () => {
  console.log(`NutriTrack Render scraper listening on :${PORT}`);
});
