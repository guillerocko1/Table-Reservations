-- Restaurant Table Reservations -- Supabase schema
--
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New
-- query -> paste this file -> Run) against a fresh project. Safe to re-run
-- against the same project: every statement is idempotent.

create table if not exists reservations (
  table_number       integer primary key,
  guest_name         text not null,
  tags               text[] not null default '{}',
  party_size         integer not null,
  celebration        text not null,
  allergies          text not null default '',
  reservation_time   text not null,
  start_time         text,
  time_limit_minutes integer not null,
  final_time         text,
  server_name        text not null default '',
  -- Bookkeeping only: set by the default on insert, not refreshed on
  -- update. Nothing in the app reads this column.
  updated_at         timestamptz not null default now()
);

create table if not exists servers (
  slot_index integer primary key check (slot_index >= 0 and slot_index < 5),
  name       text not null default ''
);

-- Seed the 5 fixed server-roster slots (no-op if they already exist).
insert into servers (slot_index, name)
values (0, ''), (1, ''), (2, ''), (3, ''), (4, '')
on conflict (slot_index) do nothing;

-- Row Level Security: enabled with an open policy (not disabled outright),
-- so tightening access later is a policy change, not a structural one. See
-- docs/superpowers/specs/2026-08-26-realtime-multi-device-sync-design.md.
alter table reservations enable row level security;
alter table servers enable row level security;

drop policy if exists "Allow anon full access" on reservations;
create policy "Allow anon full access" on reservations
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "Allow anon full access" on servers;
create policy "Allow anon full access" on servers
  for all
  to anon
  using (true)
  with check (true);

-- Realtime: broadcast changes on both tables to subscribed clients. Wrapped
-- in existence checks so re-running this script doesn't error with
-- "relation is already member of publication".
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'reservations'
  ) then
    alter publication supabase_realtime add table reservations;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'servers'
  ) then
    alter publication supabase_realtime add table servers;
  end if;
end $$;
