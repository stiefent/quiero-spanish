-- Supabase schema for saved progress (planned: week 3, accounts + sync).
-- Version 1 keeps progress in the browser (src/lib/progress.ts); this schema
-- mirrors that shape so the store can swap to Supabase without UI changes.

create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp integer not null default 0,
  streak integer not null default 0,
  last_day date,
  updated_at timestamptz not null default now()
);

-- One row per word per learner: its Leitner box and next review time.
create table if not exists public.item_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  box smallint not null default 0 check (box between 0 and 5),
  due timestamptz not null default now(),
  seen integer not null default 0,
  misses integer not null default 0,
  primary key (user_id, item_id)
);

create table if not exists public.unit_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  unit_id text not null,
  completed integer not null default 0,
  best real not null default 0,
  primary key (user_id, unit_id)
);

alter table public.progress enable row level security;
alter table public.item_state enable row level security;
alter table public.unit_state enable row level security;

create policy "own progress" on public.progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own items" on public.item_state for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own units" on public.unit_state for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
