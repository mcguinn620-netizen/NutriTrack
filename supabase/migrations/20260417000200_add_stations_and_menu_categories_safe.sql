-- Safe, additive alignment migration for NutriTrack menu hierarchy.
-- Goal: ensure dining_halls -> stations -> menu_categories -> food_items link path exists
-- without destructive changes and without assuming empty tables.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- stations
-- Prefer existing naming used by app/scraper: dining_hall_id.
-- ---------------------------------------------------------
create table if not exists public.stations (
  id text primary key default gen_random_uuid()::text,
  dining_hall_id text not null references public.dining_halls(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (dining_hall_id, name)
);

alter table if exists public.stations
  add column if not exists id text,
  add column if not exists dining_hall_id text,
  add column if not exists name text,
  add column if not exists created_at timestamptz not null default now();

-- If an older shape used hall_id, keep a compatibility column available.
alter table if exists public.stations
  add column if not exists hall_id text;

-- Backfill compatibility alias conservatively.
update public.stations
set hall_id = dining_hall_id
where hall_id is null
  and dining_hall_id is not null;

create index if not exists idx_stations_hall_id
  on public.stations(dining_hall_id);

create unique index if not exists idx_stations_hall_name_unique
  on public.stations(dining_hall_id, name);

-- ---------------------------------------------------------
-- menu_categories
-- ---------------------------------------------------------
create table if not exists public.menu_categories (
  id text primary key default gen_random_uuid()::text,
  station_id text not null references public.stations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (station_id, name)
);

alter table if exists public.menu_categories
  add column if not exists id text,
  add column if not exists station_id text,
  add column if not exists name text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_menu_categories_station_id
  on public.menu_categories(station_id);

create unique index if not exists idx_menu_categories_station_name_unique
  on public.menu_categories(station_id, name);

-- ---------------------------------------------------------
-- food_items linkage fields (safe, nullable additions)
-- ---------------------------------------------------------
alter table if exists public.food_items
  add column if not exists station_id text;

alter table if exists public.food_items
  add column if not exists category_id text;

create index if not exists idx_food_items_station_id
  on public.food_items(station_id);

create index if not exists idx_food_items_category_id
  on public.food_items(category_id);

-- ---------------------------------------------------------
-- Foreign keys (defensive): add only when relation columns/types are compatible.
-- Use NOT VALID to avoid failing on pre-existing orphan rows.
-- ---------------------------------------------------------
do $$
declare
  stations_hall_col text;
  stations_hall_col_type text;
  dining_halls_id_type text;
  stations_id_type text;
  menu_categories_station_id_type text;
  food_items_station_id_type text;
  food_items_category_id_type text;
  menu_categories_id_type text;
begin
  -- Detect whether stations uses dining_hall_id (preferred) or hall_id.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stations'
      and column_name = 'dining_hall_id'
  ) then
    stations_hall_col := 'dining_hall_id';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stations'
      and column_name = 'hall_id'
  ) then
    stations_hall_col := 'hall_id';
  end if;

  select data_type into dining_halls_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'dining_halls' and column_name = 'id';

  if stations_hall_col is not null then
    select data_type into stations_hall_col_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'stations' and column_name = stations_hall_col;

    if stations_hall_col_type = dining_halls_id_type then
      if stations_hall_col = 'dining_hall_id' then
        if not exists (
          select 1 from pg_constraint
          where conname = 'stations_dining_hall_id_fkey'
            and conrelid = 'public.stations'::regclass
        ) then
          execute 'alter table public.stations add constraint stations_dining_hall_id_fkey foreign key (dining_hall_id) references public.dining_halls(id) on delete cascade not valid';
        end if;
      else
        if not exists (
          select 1 from pg_constraint
          where conname = 'stations_hall_id_fkey'
            and conrelid = 'public.stations'::regclass
        ) then
          execute 'alter table public.stations add constraint stations_hall_id_fkey foreign key (hall_id) references public.dining_halls(id) on delete cascade not valid';
        end if;
      end if;
    end if;
  end if;

  select data_type into stations_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'stations' and column_name = 'id';

  select data_type into menu_categories_station_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'menu_categories' and column_name = 'station_id';

  if stations_id_type is not null
     and menu_categories_station_id_type is not null
     and stations_id_type = menu_categories_station_id_type
     and not exists (
      select 1 from pg_constraint
      where conname = 'menu_categories_station_id_fkey'
        and conrelid = 'public.menu_categories'::regclass
     ) then
    alter table public.menu_categories
      add constraint menu_categories_station_id_fkey
      foreign key (station_id) references public.stations(id) on delete cascade not valid;
  end if;

  select data_type into food_items_station_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'food_items' and column_name = 'station_id';

  if stations_id_type is not null
     and food_items_station_id_type is not null
     and stations_id_type = food_items_station_id_type
     and not exists (
      select 1 from pg_constraint
      where conname = 'food_items_station_id_fkey'
        and conrelid = 'public.food_items'::regclass
     ) then
    alter table public.food_items
      add constraint food_items_station_id_fkey
      foreign key (station_id) references public.stations(id) on delete set null not valid;
  end if;

  select data_type into menu_categories_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'menu_categories' and column_name = 'id';

  select data_type into food_items_category_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'food_items' and column_name = 'category_id';

  if menu_categories_id_type is not null
     and food_items_category_id_type is not null
     and menu_categories_id_type = food_items_category_id_type
     and not exists (
      select 1 from pg_constraint
      where conname = 'food_items_category_id_fkey'
        and conrelid = 'public.food_items'::regclass
     ) then
    alter table public.food_items
      add constraint food_items_category_id_fkey
      foreign key (category_id) references public.menu_categories(id) on delete set null not valid;
  end if;
end
$$;
