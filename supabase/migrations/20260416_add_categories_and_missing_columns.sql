-- =========================================================
-- NutriTrack additive schema update
-- Preserves existing tables and adds missing columns/tables
-- based on current scrape target:
-- dining_halls -> stations -> menu_categories -> food_items
-- plus nutrition_facts / metadata support
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- dining_halls
-- CSV/layout target:
-- id, name, unit_oid, created_at
-- ---------------------------------------------------------
alter table public.dining_halls
  add column if not exists unit_oid integer,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists idx_dining_halls_unit_oid
  on public.dining_halls(unit_oid);

-- ---------------------------------------------------------
-- stations
-- create if missing
-- CSV/layout target:
-- id, dining_hall_id, name, unit_oid, created_at
-- ---------------------------------------------------------
create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  dining_hall_id uuid not null references public.dining_halls(id) on delete cascade,
  name text not null,
  unit_oid integer not null,
  created_at timestamptz not null default now()
);

alter table public.stations
  add column if not exists dining_hall_id uuid references public.dining_halls(id) on delete cascade,
  add column if not exists name text,
  add column if not exists unit_oid integer,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists idx_stations_unit_oid
  on public.stations(unit_oid);

create index if not exists idx_stations_dining_hall_id
  on public.stations(dining_hall_id);

-- ---------------------------------------------------------
-- menu_categories
-- category key comes from cbo_nn_itemGroupRow
-- target:
-- id, station_id, name, created_at
-- ---------------------------------------------------------
create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (station_id, name)
);

alter table public.menu_categories
  add column if not exists station_id uuid references public.stations(id) on delete cascade,
  add column if not exists name text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_menu_categories_station_id
  on public.menu_categories(station_id);

-- ---------------------------------------------------------
-- food_items
-- CSV/layout target:
-- id, station_id, name, detail_oid, serving_size,
-- allergens, dietary_flags, nutrients, created_at, updated_at
-- add category_id for grouped categories
-- ---------------------------------------------------------
alter table public.food_items
  add column if not exists station_id uuid references public.stations(id) on delete cascade,
  add column if not exists category_id uuid references public.menu_categories(id) on delete set null,
  add column if not exists name text,
  add column if not exists detail_oid integer,
  add column if not exists serving_size text,
  add column if not exists allergens jsonb not null default '[]'::jsonb,
  add column if not exists dietary_flags jsonb not null default '[]'::jsonb,
  add column if not exists nutrients jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_food_items_detail_oid
  on public.food_items(detail_oid);

create index if not exists idx_food_items_station_id
  on public.food_items(station_id);

create index if not exists idx_food_items_category_id
  on public.food_items(category_id);

-- ---------------------------------------------------------
-- menus
-- keep if already present, add likely useful links
-- ---------------------------------------------------------
alter table public.menus
  add column if not exists station_id uuid references public.stations(id) on delete cascade,
  add column if not exists name text,
  add column if not exists menu_oid integer,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_menus_station_id
  on public.menus(station_id);

-- ---------------------------------------------------------
-- metadata
-- keep cache / scrape metadata
-- ---------------------------------------------------------
alter table public.metadata
  add column if not exists id integer,
  add column if not exists last_updated timestamptz;

-- optional singleton PK if not present
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'metadata_pkey'
  ) then
    begin
      alter table public.metadata add primary key (id);
    exception
      when others then null;
    end;
  end if;
end $$;

-- ---------------------------------------------------------
-- nutrition_facts
-- target:
-- id, item_id, calories, protein, carbs, fat, raw_label_json
-- ---------------------------------------------------------
create table if not exists public.nutrition_facts (
  id text primary key,
  item_id uuid not null references public.food_items(id) on delete cascade,
  calories numeric null,
  protein numeric null,
  carbs numeric null,
  fat numeric null,
  raw_label_json jsonb not null default '{}'::jsonb
);

alter table public.nutrition_facts
  add column if not exists item_id uuid references public.food_items(id) on delete cascade,
  add column if not exists calories numeric,
  add column if not exists protein numeric,
  add column if not exists carbs numeric,
  add column if not exists fat numeric,
  add column if not exists raw_label_json jsonb not null default '{}'::jsonb;

create index if not exists idx_nutrition_facts_item_id
  on public.nutrition_facts(item_id);

-- ---------------------------------------------------------
-- scrape_logs
-- keep log table healthy
-- ---------------------------------------------------------
alter table public.scrape_logs
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists status text,
  add column if not exists message text,
  add column if not exists items_count integer,
  add column if not exists scraped_at timestamptz not null default now();

-- optional PK if missing
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'scrape_logs_pkey'
  ) then
    begin
      alter table public.scrape_logs add primary key (id);
    exception
      when others then null;
    end;
  end if;
end $$;

create index if not exists idx_scrape_logs_scraped_at
  on public.scrape_logs(scraped_at desc);

-- ---------------------------------------------------------
-- updated_at trigger for food_items
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_food_items_updated_at on public.food_items;

create trigger trg_food_items_updated_at
before update on public.food_items
for each row
execute function public.set_updated_at();