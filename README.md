# Welcome to OnSpace AI

Onspace AI empowers anyone to turn ideas into powerful AI applications in minutes—no coding required. Our free, no-code platform enables effortless creation of custom AI apps; simply describe your vision and our agentic AI handles the rest. The onspace-app, built with React Native and Expo, demonstrates this capability—integrating popular third-party libraries to deliver seamless cross-platform performance across iOS, Android, and Web environments.

## Getting Started

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Start the Project

- Start the development server (choose your platform):

```bash
npm run start         # Start Expo development server
npm run android       # Launch Android emulator
npm run ios           # Launch iOS simulator
npm run web           # Start the web version
```

- Reset the project (clear cache, etc.):

```bash
npm run reset-project
```

### 3. Lint the Code

```bash
npm run lint
```

## Supabase setup (required for Edge Functions)

1. Copy env template and set your project values:

```bash
cp .env.example .env
```

2. In `.env`, set:

- `EXPO_PUBLIC_SUPABASE_URL=https://upjotaeatvessmbrorgx.supabase.co`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_hFKJ7yVVcObiQ_A4ukfUjw_raclp5di`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` may also be used (the app accepts either key name).

3. Link and deploy the Edge Function:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy netnutrition --no-verify-jwt
```

> This repo includes `supabase/functions/netnutrition/config.toml` with `verify_jwt = false` so the app can invoke the function without a signed-in user session.

4. Smoke test the deployed function:

```bash
curl -sS -D /tmp/nn_headers.txt \
  -o /tmp/nn_body.json \
  -X POST \
  "https://upjotaeatvessmbrorgx.supabase.co/functions/v1/netnutrition" \
  -H "Content-Type: application/json" \
  -H "apikey: $EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  --data '{"url":"http://netnutrition.bsu.edu/NetNutrition/1#"}'

# Parse result shape (units -> menus -> items -> traits -> nutrition)
jq '.units[0].menus[0].items[0]' /tmp/nn_body.json
```

## Main Dependencies

- React Native: 0.79.4
- React: 19.0.0
- Expo: ~53.0.12
- Expo Router: ~5.1.0
- Supabase: ^2.50.0
- Other commonly used libraries:  
  - @expo/vector-icons  
  - react-native-paper  
  - react-native-calendars  
  - lottie-react-native  
  - react-native-webview  
  - and more

For a full list of dependencies, see [package.json](./package.json).

## Development Tools

- TypeScript: ~5.8.3
- ESLint: ^9.25.0
- @babel/core: ^7.25.2

## Contributing

1. Fork this repository
2. Create a new branch (`git checkout -b main`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is private ("private": true). For collaboration inquiries, please contact the author.

---

Feel free to add project screenshots, API documentation, feature descriptions, or any other information as needed.

## Backend API (Render + React Native)

A production-ready backend is available in [`backend/`](./backend) with Express, Playwright scraping, and Supabase-backed caching.

### Backend setup

```bash
cd backend
npm install
npm run build
npm start
```

### Environment variables

Set these in Render (or local `.env` inside `backend/`):

- `PORT` (Render provides this automatically)
- `NETNUTRITION_URL` (example: `http://netnutrition.bsu.edu/NetNutrition/1`)
- `NETNUTRITION_HALL_PARAM` (optional, defaults to `cboUnit`)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (optional, only if future AI post-processing is added)

### API endpoints

- `GET /health` → `{ "status": "OK" }`
- `GET /halls` → list available dining halls (cached when available)
- `GET /menu?hall=<hall-name-or-id>` → hall menu (cached for 7 days, auto refresh if stale)
- `POST /scrape` → force fresh scrape for all halls, update cache, and return fresh results

### React Native integration

Use your Render URL as API base, then call:

- `GET /halls` to populate hall picker
- `GET /menu?hall=...` to fetch menu data for a selected hall
- `POST /scrape` to allow manual refresh

### Supabase table for weekly cache

Run in Supabase SQL editor if the table does not already exist:

```sql
create table if not exists public.menus (
  hall text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
```

### Render deployment

A `render.yaml` is included. Equivalent manual setup for a Render Web Service:

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment: `Node`
- Required env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NETNUTRITION_URL`

The backend binds to `0.0.0.0` and `process.env.PORT`, which is required by Render Web Services.
