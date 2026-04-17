# NutriTrack

NutriTrack is an Expo + React Native app powered entirely by Supabase.

## Architecture

App (Expo / React Native) → Supabase Edge Function (`menu`) → Supabase Database → App queries data from `food_items`.

## Environment

Create `.env` with only:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://upjotaeatvessmbrorgx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_hFKJ7yVVcObiQ_A4ukfUjw_raclp5di
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
await supabase.functions.invoke('menu');
```

- Read menu data:

```ts
const { data, error } = await supabase
  .from('food_items')
  .select('*, stations(name, dining_halls(name))');
```
