-- Align schema with live Supabase tables and grouped-category scrape requirements.
-- Additive only: no table drops.

create table if not exists public.stations (
  id text primary key,
  dining_hall_id text not null references public.dining_halls(id) on delete cascade,
  name text not null,
  unit_oid bigint,
  created_at timestamptz not null default now()
);

alter table if exists public.dining_halls
  add column if not exists unit_oid bigint,
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.stations
  add column if not exists dining_hall_id text,
  add column if not exists name text,
  add column if not exists unit_oid bigint,
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.menu_categories
  add column if not exists station_id text,
  add column if not exists name text,
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.food_items
  add column if not exists station_id text,
  add column if not exists category_id text,
  add column if not exists name text,
  add column if not exists detail_oid bigint,
  add column if not exists serving_size text,
  add column if not exists allergens text[] not null default '{}'::text[],
  add column if not exists dietary_flags text[] not null default '{}'::text[],
  add column if not exists nutrients jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.nutrition_facts
  add column if not exists item_id text,
  add column if not exists calories numeric,
  add column if not exists protein numeric,
  add column if not exists carbs numeric,
  add column if not exists fat numeric,
  add column if not exists raw_label_json jsonb not null default '{}'::jsonb;

alter table if exists public.metadata
  add column if not exists id int,
  add column if not exists last_updated timestamptz;

insert into public.metadata (id, last_updated)
values (1, null)
on conflict (id) do nothing;

-- Foreign keys (only add when absent).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stations_dining_hall_id_fkey'
      and conrelid = 'public.stations'::regclass
  ) then
    alter table public.stations
      add constraint stations_dining_hall_id_fkey
      foreign key (dining_hall_id) references public.dining_halls(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_categories_station_id_fkey'
      and conrelid = 'public.menu_categories'::regclass
  ) then
    alter table public.menu_categories
      add constraint menu_categories_station_id_fkey
      foreign key (station_id) references public.stations(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'food_items_station_id_fkey'
      and conrelid = 'public.food_items'::regclass
  ) then
    alter table public.food_items
      add constraint food_items_station_id_fkey
      foreign key (station_id) references public.stations(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'food_items_category_id_fkey'
      and conrelid = 'public.food_items'::regclass
  ) then
    alter table public.food_items
      add constraint food_items_category_id_fkey
      foreign key (category_id) references public.menu_categories(id) on delete cascade;
  end if;
end
$$;

-- Required uniqueness for grouped categories per station.
create unique index if not exists menu_categories_station_id_name_key
  on public.menu_categories (station_id, name);

-- Useful indexes.
create index if not exists dining_halls_unit_oid_idx on public.dining_halls (unit_oid);
create index if not exists stations_unit_oid_idx on public.stations (unit_oid);
create index if not exists stations_dining_hall_id_idx on public.stations (dining_hall_id);
create index if not exists menu_categories_station_id_idx on public.menu_categories (station_id);
create index if not exists food_items_station_id_idx on public.food_items (station_id);
create index if not exists food_items_category_id_idx on public.food_items (category_id);
create index if not exists food_items_detail_oid_idx on public.food_items (detail_oid);
create index if not exists nutrition_facts_item_id_idx on public.nutrition_facts (item_id);

-- Keep updated_at behavior for food_items.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_food_items on public.food_items;
create trigger set_updated_at_food_items
before update on public.food_items
for each row execute function public.set_updated_at();
