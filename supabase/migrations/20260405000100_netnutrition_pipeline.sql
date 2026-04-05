create table if not exists public.dining_halls (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_categories (
  id text primary key,
  hall_id text not null references public.dining_halls(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.food_items (
  id text primary key,
  category_id text not null references public.menu_categories(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nutrition_facts (
  id text primary key,
  item_id text not null references public.food_items(id) on delete cascade,
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  raw_label_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.metadata (
  id int primary key,
  last_updated timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (id = 1)
);

insert into public.metadata (id, last_updated)
values (1, null)
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_dining_halls on public.dining_halls;
create trigger set_updated_at_dining_halls
before update on public.dining_halls
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_menu_categories on public.menu_categories;
create trigger set_updated_at_menu_categories
before update on public.menu_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_food_items on public.food_items;
create trigger set_updated_at_food_items
before update on public.food_items
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_nutrition_facts on public.nutrition_facts;
create trigger set_updated_at_nutrition_facts
before update on public.nutrition_facts
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_metadata on public.metadata;
create trigger set_updated_at_metadata
before update on public.metadata
for each row execute function public.set_updated_at();
