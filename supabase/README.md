# Supabase

Trigger update: 2026-04-07T23:59:00Z

## NutriTrack menu hierarchy mapping

Scraper (`supabase/functions/menu`) expects this logical mapping:

- dining hall -> `public.dining_halls`
- station -> `public.stations`
- menu category/course -> `public.menu_categories`
- item -> `public.food_items`

Recommended natural-key upserts used by scraper flow:

- `dining_halls`: `unique(unit_oid)` for ingestion, while names remain user-facing.
- `stations`: `unique(dining_hall_id, name)` (also frequently upserted by `unit_oid` when present).
- `menu_categories`: `unique(station_id, name)`.

Compatibility note:

- The codebase currently uses `stations.dining_hall_id` (not `hall_id`) as the FK path to `dining_halls.id`.
- The expected nested app query is supported via FK chain:
  - `food_items.station_id -> stations.id`
  - `stations.dining_hall_id -> dining_halls.id`
