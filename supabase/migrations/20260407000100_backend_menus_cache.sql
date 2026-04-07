create table if not exists public.menus (
  hall text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists menus_updated_at_idx on public.menus (updated_at desc);
