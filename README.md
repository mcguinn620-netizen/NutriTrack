# NutriTrack

NutriTrack is an Expo + React Native app powered entirely by Supabase.

## Architecture

App (Expo / React Native) → Supabase Edge Function (`netnutrition-scrape`) → Supabase Database → App queries read-only data from `dining_halls`, `stations`, `menu_categories`, and `food_items`.

## Environment

For now, Supabase credentials are centralized in `services/supabaseClient.ts` to keep builds stable. Plan to move to:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://drtuuuqtgihqvzcripec.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<project anon key>
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

- Read menu data with relations:

```ts
const { data, error } = await supabase
  .from('food_items')
  .select('*, stations(name, dining_halls(name))');
```
