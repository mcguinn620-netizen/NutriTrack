# Render scraper + Supabase Edge Function wiring

This setup keeps scraping isolated in Render and lets the app call only Supabase Edge Functions.

## 1) Render scraper deployment

Directory: `scraper-render`

Required files:
- `scraper-render/index.js` (Express service with `/health`, `/netnutrition`, `/refresh`)
- `scraper-render/utils/parser.js` (HTTP-only scraper with retry/backoff)
- `scraper-render/package.json`

### Create a Render Web Service
- **Root Directory:** `scraper-render`
- **Build Command:**
  ```bash
  npm install
  ```
- **Start Command:**
  ```bash
  npm start
  ```

No Playwright/browser dependencies are required.

### Render environment variables
- `PORT` (Render sets this automatically)

### Smoke test
```bash
curl https://YOUR-RENDER-SERVICE.onrender.com/health
curl https://YOUR-RENDER-SERVICE.onrender.com/netnutrition
curl -X POST https://YOUR-RENDER-SERVICE.onrender.com/refresh
```

## 2) Supabase Edge Function proxy

Set in Supabase project secrets:

- `RENDER_SCRAPER_URL=https://YOUR-RENDER-SERVICE.onrender.com/netnutrition`

The function does **not** scrape the NetNutrition site directly. It only proxies Render.
