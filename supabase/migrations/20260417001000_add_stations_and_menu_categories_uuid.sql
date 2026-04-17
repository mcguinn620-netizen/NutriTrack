create extension if not exists pgcrypto;

create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  hall_id uuid not null references public.dining_halls(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (hall_id, name)
);

create index if not exists idx_stations_hall_id
  on public.stations(hall_id);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (station_id, name)
);

create index if not exists idx_menu_categories_station_id
  on public.menu_categories(station_id);

-- If public.food_items.category_id is not present yet, add it in a separate migration
-- and wire its FK to public.menu_categories(id) once the column type is confirmed.
