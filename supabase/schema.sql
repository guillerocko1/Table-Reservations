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

-- 86'd dishes: restaurant-wide, not tied to any table/reservation. A row
-- exists for as long as the dish is 86'd; removing it (once restocked) is
-- a plain delete, same "gone means not 86'd" model reservations uses for
-- an empty table.
create table if not exists eighty_sixed_items (
  id         bigint generated always as identity primary key,
  dish_name  text not null,
  created_at timestamptz not null default now()
);

-- Special notes: free-form notes about an employee (date + 500-char note),
-- restaurant-wide like eighty_sixed_items, not tied to any table. A row is
-- kept until an admin removes it - no "resolved" state, same plain-delete
-- model the other admin-managed lists use.
-- notify_at: optional "pop this note up big on the Admin View at this
-- moment" reminder, set via the note's "Send notification" control.
-- Cleared back to null when dismissed (or never set) - same "presence
-- means active" model eighty_sixed_items uses, just a nullable column
-- instead of a whole row, since a note can only have one pending reminder
-- at a time.
-- notified_at: set once, permanently, the first time this note's reminder
-- has actually popped up and been dismissed - unlike notify_at (cleared
-- back to null on dismiss so a note can be rescheduled), this never
-- clears, so "Pending" vs "Done" survives rescheduling.
create table if not exists special_notes (
  id             bigint generated always as identity primary key,
  note_date      date not null,
  employee_name  text not null,
  note           text not null check (char_length(note) <= 500),
  notify_at      timestamptz,
  notified_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- Idempotent column adds for a project that already ran this file before
-- these columns existed.
alter table special_notes add column if not exists notify_at timestamptz;
alter table special_notes add column if not exists notified_at timestamptz;

-- The restaurant's servers - a real, admin-editable list (add, rename,
-- delete) backing the server-roster slot dropdowns, instead of a fixed
-- list baked into the app's code. Kept separate from hostesses (below):
-- the two roles pick from two different name lists, not a shared one.
-- Renaming/deleting here only changes what's offered going forward:
-- existing reservations/servers rows keep whatever name string they
-- already have (same "snapshot, not a foreign key" model those already
-- use for an off-list name).
create table if not exists employees (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- Seed with the restaurant's current servers (no-op if already present).
insert into employees (name)
values
  ('Alicia'), ('Aria'), ('Ariel'), ('Bianca'), ('Cortney'), ('Emon'),
  ('Faby'), ('Flora'), ('Francisco'), ('Jorge'), ('Laurel'), ('Lily'),
  ('Mariah'), ('Michelle'), ('Natasha'), ('Stevie')
on conflict (name) do nothing;

-- The restaurant's hostesses - same admin-editable model as the servers
-- list above (employees), backing the Special Notes employee dropdown.
-- Starts empty: unlike servers, there's no existing fixed roster to seed
-- from, so the admin builds this list via Special Notes' "Edit hostess
-- list" control.
create table if not exists hostesses (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  created_at timestamptz not null default now()
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
alter table eighty_sixed_items enable row level security;
alter table special_notes enable row level security;
alter table employees enable row level security;
alter table hostesses enable row level security;

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

drop policy if exists "Allow anon full access" on eighty_sixed_items;
create policy "Allow anon full access" on eighty_sixed_items
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "Allow anon full access" on special_notes;
create policy "Allow anon full access" on special_notes
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "Allow anon full access" on employees;
create policy "Allow anon full access" on employees
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "Allow anon full access" on hostesses;
create policy "Allow anon full access" on hostesses
  for all
  to anon
  using (true)
  with check (true);

-- Realtime: broadcast changes on all six tables to subscribed clients.
-- Wrapped in existence checks so re-running this script doesn't error with
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

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'eighty_sixed_items'
  ) then
    alter publication supabase_realtime add table eighty_sixed_items;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'special_notes'
  ) then
    alter publication supabase_realtime add table special_notes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'employees'
  ) then
    alter publication supabase_realtime add table employees;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'hostesses'
  ) then
    alter publication supabase_realtime add table hostesses;
  end if;
end $$;
