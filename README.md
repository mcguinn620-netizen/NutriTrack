# NutriTrack

NutriTrack is an Expo + React Native app powered entirely by Supabase.

## Architecture

App (Expo / React Native) → Supabase Edge Function (`netnutrition-scrape`) → Supabase Database → App queries data from `food_items`.

## Environment

Create `.env` with only:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Local development

```bash
npm install
npm run start
npm run android
npm run ios
npm run web
```

## Data flow

- Trigger scraper:

```ts
await supabase.functions.invoke('netnutrition-scrape');
```

- Read menu data:

```ts
const { data, error } = await supabase
  .from('food_items')
  .select('*, stations(name, dining_halls(name))');
```
