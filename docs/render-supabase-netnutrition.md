# Render scraper + Supabase Edge Function wiring

This setup keeps scraping isolated in Render and lets the app call only Supabase Edge Functions.

## 1) Render scraper deployment

Directory: `scraper-render`

### Files included
- `scraper-render/index.js` (Playwright scraper + `/netnutrition` endpoint)
- `scraper-render/package.json`
- `scraper-render/playwright.config.cjs`

### Create a Render Web Service
- **Root Directory:** `scraper-render`
- **Build Command:**
  ```bash
  npm install --legacy-peer-deps && npx playwright install chromium
  ```
- **Start Command:**
  ```bash
  npm start
  ```

### Render environment variables
- `NETNUTRITION_URL=http://netnutrition.bsu.edu/NetNutrition/1`
- `PLAYWRIGHT_BROWSERS_PATH=/opt/render/project/.cache/ms-playwright`

After deploy, test:
```bash
curl https://YOUR-RENDER-SERVICE.onrender.com/netnutrition
```

Expected response shape includes:
```json
{
  "sourceUrl": "http://netnutrition.bsu.edu/NetNutrition/1",
  "generatedAt": "2026-04-07T...Z",
  "units": [
    {
      "name": "...",
      "items": [ { "name": "..." } ],
      "menus": [ ... ]
    }
  ]
}
```

## 2) Supabase Edge Function deployment

Function path: `supabase/functions/netnutrition/index.ts`

### Environment variables (Supabase project)
- `RENDER_SCRAPER_URL=https://YOUR-RENDER-SERVICE.onrender.com/netnutrition`
- Optional persistence:
  - `STORE_RESULTS=true`
  - `STORE_TABLE=netnutrition_cache`
  - `SUPABASE_SERVICE_ROLE_KEY=...`

### Deploy command
```bash
supabase functions deploy netnutrition --no-verify-jwt
```

The function does **not** scrape the NetNutrition site directly. It only proxies Render.

## 3) App fetch flow

Your app should fetch only from:
```text
https://<project-ref>.supabase.co/functions/v1/netnutrition
```

Example test:
```bash
curl -i https://<project-ref>.supabase.co/functions/v1/netnutrition
```

Expected success format:
```json
{ "units": [ { "name": "...", "items": [ ... ] } ] }
```

Expected error format:
```json
{ "error": "...", "sourceUrl": "https://YOUR-RENDER-SERVICE.onrender.com/netnutrition" }
```

## 4) Optional storage table

If enabling `STORE_RESULTS=true`, create a table like:

```sql
create table if not exists public.netnutrition_cache (
  id bigint generated always as identity primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
```
