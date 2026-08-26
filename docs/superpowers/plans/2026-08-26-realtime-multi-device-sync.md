# Realtime Multi-Device Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace this app's per-browser `localStorage` persistence with a shared Supabase (Postgres + Realtime) backend, so a change an admin makes on one device appears on every other open device (admin or staff, any browser) within about a second, with no manual refresh.

**Architecture:** Two Postgres tables (`reservations`, `servers`) with Row Level Security enabled and an open policy for the `anon` role, both added to Supabase's realtime publication. The browser talks to Supabase directly over HTTPS/WebSocket via `@supabase/supabase-js` — no new server layer, so the existing GitHub Pages static-export deployment is unchanged. Pure row-mapping functions (`rowToReservation`/`reservationToRow`, `rowsToServerNames`) live in their own files, importable and unit-testable with zero network dependency; the Supabase network calls (fetch/upsert/delete/subscribe) live alongside them in sibling files and are verified manually, matching how this project has always treated hooks. `useReservations`/`useServerRoster` are rewritten in place around the new async, realtime-subscribed store, keeping their returned shape close enough that only `app/page.tsx`, `app/staff/page.tsx`, and `components/ReservationPanel.tsx` need updates.

**Tech Stack:** Adds `@supabase/supabase-js` to the existing Next.js 16 / React 19 / TypeScript / Tailwind stack. No other new dependencies.

**Spec:** [docs/superpowers/specs/2026-08-26-realtime-multi-device-sync-design.md](../specs/2026-08-26-realtime-multi-device-sync-design.md)

## Global Constraints

- No authentication/access control — the app stays fully open, same trust model as today (per Guillermo's decision).
- No offline support: a disconnected device shows a clear error/disconnected state, no local queueing or conflict resolution.
- No migration of existing `localStorage` data — the shared database starts empty.
- The Supabase anon/publishable key is safe to expose client-side by design (like a Stripe publishable key); it's still sourced from an env var (`NEXT_PUBLIC_SUPABASE_ANON_KEY`), never hardcoded, per this project's existing convention.
- RLS is enabled (not disabled) on both tables, with an explicit permissive policy for the `anon` role.
- Keep the GitHub Pages static-export deployment — no server/API route is introduced.
- ES modules, 2-space indentation, `async`/`await`, descriptive names — this project's existing style throughout.
- Pure logic (row mappers) gets unit tests; the network/Realtime code itself is verified manually across multiple devices/tabs, not unit tested — this project has never unit-tested its hooks, only the pure functions around them.
- Supabase project already created: URL `https://xwilvwkdlybrrvfhlvow.supabase.co`, anon/publishable key `sb_publishable_de2zDQ_FiL6Hd9yra33ncw_H9N6O9sY`.

## Manual Steps Required (controller-led, not delegated to task subagents)

Two steps in this plan need a human with dashboard/settings access and can't be done by an implementer subagent working in an isolated repo checkout:

1. **After Task 2:** run `supabase/schema.sql` once against the live Supabase project (Supabase dashboard → SQL Editor → paste the file's contents → Run). Needed before the live multi-device QA in Task 10; not needed for any task's automated typecheck/lint/test/build gate before that, since none of those touch a real database.
2. **Before Task 10 (or any time before it):** add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as GitHub Actions **repository variables** (repo → Settings → Secrets and variables → Actions → **Variables** tab → New repository variable), using the same values as above, so the GitHub Pages build can bake them in.

The plan's controller (not a dispatched implementer) will prompt for these at the right point during execution.

---

### Task 1: Supabase client + environment variable scaffolding

**Files:**
- Create: `lib/supabaseClient.ts`
- Create: `.env.example`
- Create: `.env.local` (gitignored — not committed, but must exist locally for `npm run dev`/`npm run build` to work)
- Modify: `package.json` (via `npm install`, not hand-edited)
- Modify: `README.md`

**Interfaces:**
- Produces: `supabase` — a configured `SupabaseClient` instance, the single shared client every later task's Supabase calls go through.

- [ ] **Step 1: Install the Supabase client library**

Run: `npm install @supabase/supabase-js`

This adds the dependency to `package.json`'s `dependencies` and updates `package-lock.json`.

- [ ] **Step 2: Create the env var template**

Create `.env.example`:

```
# Copy this file to .env.local and fill in your Supabase project's values
# (Supabase dashboard -> Project Settings -> API). .env.local is gitignored;
# never commit real values here.
#
# The anon/publishable key is safe to expose in browser code by design -
# see docs/superpowers/specs/2026-08-26-realtime-multi-device-sync-design.md
# ("Access Control & the Anon Key").
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: Create the local env file with real values**

Create `.env.local` (already covered by `.gitignore`'s `.env.local` entry — confirm with `git check-ignore .env.local` after creating it):

```
NEXT_PUBLIC_SUPABASE_URL=https://xwilvwkdlybrrvfhlvow.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_de2zDQ_FiL6Hd9yra33ncw_H9N6O9sY
```

- [ ] **Step 4: Create the Supabase client module**

Create `lib/supabaseClient.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to " +
      ".env.local and fill in your Supabase project's values (Project Settings → API).",
  );
}

// A single shared client for the whole app - Supabase's client is meant to
// be reused, not recreated per component (it manages its own realtime
// socket and auth state internally).
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 5: Verify it type-checks and lints clean**

Run: `npm run typecheck && npm run lint`
Expected: both pass with no errors (nothing imports this file yet, but it must still be valid on its own).

- [ ] **Step 6: Add setup instructions to the README**

In `README.md`, insert a new "## Setup" section right after the "## Running it" section (before "## Table layout"):

```markdown
## Setup

Copy `.env.example` to `.env.local` and fill in your Supabase project's
values (Supabase dashboard → Project Settings → API → Project URL and
`anon` `public` key):

```bash
cp .env.example .env.local
```

Without this, `npm run dev` / `npm run build` fail fast with a clear error
naming the missing variable.
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json lib/supabaseClient.ts .env.example README.md
git commit -m "Add Supabase client and env var scaffolding"
```

(`.env.local` is gitignored and won't be staged — confirm it's absent from `git status` before committing.)

---

### Task 2: Database schema

**Files:**
- Create: `supabase/schema.sql`

**Interfaces:**
- Produces: the `reservations` and `servers` tables (columns listed below) that every later task's Supabase calls read/write against. No code in this repo depends on this file directly — it's applied manually to the live project (see "Manual Steps Required" above).

- [ ] **Step 1: Write the schema file**

Create `supabase/schema.sql`:

```sql
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/schema.sql
git commit -m "Add Supabase schema: reservations and servers tables"
```

- [ ] **Step 3: Flag the manual step**

Note in the task's completion report that this schema still needs to be run against the live Supabase project by the controller/user before Task 10's live QA (see "Manual Steps Required" above) — this task itself only adds the file to the repo.

---

### Task 3: Reservations persistence module (pure mapping + Supabase network calls)

**Files:**
- Create: `lib/reservationRows.ts`
- Create: `lib/reservationsStore.ts`
- Test: `tests/reservationRows.test.ts`

**Interfaces:**
- Consumes: `supabase` from `lib/supabaseClient.ts` (Task 1); `Reservation`, `GuestTag`, `Celebration`, `TimeLimitMinutes` from `lib/reservations.ts` (existing).
- Produces:
  - `ReservationRow` interface, `rowToReservation(row: ReservationRow): Reservation`, `reservationToRow(reservation: Reservation): ReservationRow` — pure, from `lib/reservationRows.ts`.
  - `RealtimeConnectionStatus` (`"connected" | "disconnected"`), `fetchAllReservations(): Promise<Record<number, Reservation>>`, `upsertReservation(reservation: Reservation): Promise<void>`, `deleteReservation(tableNumber: number): Promise<void>`, `subscribeToReservations(onChange: (byTable: Record<number, Reservation>) => void, onStatusChange: (status: RealtimeConnectionStatus) => void): () => void` — from `lib/reservationsStore.ts`. Task 5 consumes all four of these.

- [ ] **Step 1: Write the failing tests for the pure mapping functions**

Create `tests/reservationRows.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { rowToReservation, reservationToRow, type ReservationRow } from "../lib/reservationRows.ts";
import type { Reservation } from "../lib/reservations.ts";

function makeRow(overrides: Partial<ReservationRow> = {}): ReservationRow {
  return {
    table_number: 1,
    guest_name: "Alex Rivera",
    tags: [],
    party_size: 2,
    celebration: "None",
    allergies: "",
    reservation_time: "18:00",
    start_time: null,
    time_limit_minutes: 90,
    final_time: null,
    server_name: "",
    ...overrides,
  };
}

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    tableNumber: 1,
    guestName: "Alex Rivera",
    tags: [],
    partySize: 2,
    celebration: "None",
    allergies: "",
    reservationTime: "18:00",
    startTime: null,
    timeLimitMinutes: 90,
    finalTime: null,
    serverName: "",
    ...overrides,
  };
}

test("rowToReservation: maps every snake_case column to its camelCase field", () => {
  const row = makeRow({
    table_number: 34,
    guest_name: "Jordan Lee",
    tags: ["VIP", "Regular"],
    party_size: 4,
    celebration: "Birthday",
    allergies: "peanuts",
    reservation_time: "19:00",
    start_time: "19:05",
    time_limit_minutes: 90,
    final_time: "20:35",
    server_name: "Sam",
  });
  assert.deepEqual(rowToReservation(row), {
    tableNumber: 34,
    guestName: "Jordan Lee",
    tags: ["VIP", "Regular"],
    partySize: 4,
    celebration: "Birthday",
    allergies: "peanuts",
    reservationTime: "19:00",
    startTime: "19:05",
    timeLimitMinutes: 90,
    finalTime: "20:35",
    serverName: "Sam",
  });
});

test("rowToReservation: passes through null startTime/finalTime for an unseated reservation", () => {
  const row = makeRow({ start_time: null, final_time: null });
  const reservation = rowToReservation(row);
  assert.equal(reservation.startTime, null);
  assert.equal(reservation.finalTime, null);
});

test("reservationToRow: maps every camelCase field to its snake_case column", () => {
  const reservation = makeReservation({
    tableNumber: 34,
    guestName: "Jordan Lee",
    tags: ["VIP"],
    partySize: 4,
    celebration: "Birthday",
    allergies: "peanuts",
    reservationTime: "19:00",
    startTime: "19:05",
    timeLimitMinutes: 90,
    finalTime: "20:35",
    serverName: "Sam",
  });
  assert.deepEqual(reservationToRow(reservation), {
    table_number: 34,
    guest_name: "Jordan Lee",
    tags: ["VIP"],
    party_size: 4,
    celebration: "Birthday",
    allergies: "peanuts",
    reservation_time: "19:00",
    start_time: "19:05",
    time_limit_minutes: 90,
    final_time: "20:35",
    server_name: "Sam",
  });
});

test("rowToReservation and reservationToRow round-trip a reservation", () => {
  const reservation = makeReservation({
    tableNumber: 61,
    startTime: "18:00",
    finalTime: "19:30",
    tags: ["Employee"],
  });
  assert.deepEqual(rowToReservation(reservationToRow(reservation)), reservation);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test`
Expected: FAIL — `lib/reservationRows.ts` does not exist yet (module not found).

- [ ] **Step 3: Implement the pure mapping module**

Create `lib/reservationRows.ts`:

```typescript
import type { Celebration, GuestTag, Reservation, TimeLimitMinutes } from "./reservations";

// Postgres row shape (snake_case, matching supabase/schema.sql) - kept
// separate from the app's Reservation type (camelCase) so a schema change
// only touches the two mapping functions below.
export interface ReservationRow {
  table_number: number;
  guest_name: string;
  tags: string[];
  party_size: number;
  celebration: string;
  allergies: string;
  reservation_time: string;
  start_time: string | null;
  time_limit_minutes: number;
  final_time: string | null;
  server_name: string;
}

export function rowToReservation(row: ReservationRow): Reservation {
  return {
    tableNumber: row.table_number,
    guestName: row.guest_name,
    tags: row.tags as GuestTag[],
    partySize: row.party_size,
    celebration: row.celebration as Celebration,
    allergies: row.allergies,
    reservationTime: row.reservation_time,
    startTime: row.start_time,
    timeLimitMinutes: row.time_limit_minutes as TimeLimitMinutes,
    finalTime: row.final_time,
    serverName: row.server_name,
  };
}

export function reservationToRow(reservation: Reservation): ReservationRow {
  return {
    table_number: reservation.tableNumber,
    guest_name: reservation.guestName,
    tags: reservation.tags,
    party_size: reservation.partySize,
    celebration: reservation.celebration,
    allergies: reservation.allergies,
    reservation_time: reservation.reservationTime,
    start_time: reservation.startTime,
    time_limit_minutes: reservation.timeLimitMinutes,
    final_time: reservation.finalTime,
    server_name: reservation.serverName,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test`
Expected: PASS — all 4 new tests green.

- [ ] **Step 5: Implement the Supabase network module**

Create `lib/reservationsStore.ts`:

```typescript
import { supabase } from "./supabaseClient";
import { rowToReservation, reservationToRow, type ReservationRow } from "./reservationRows";
import type { Reservation } from "./reservations";

export type RealtimeConnectionStatus = "connected" | "disconnected";

export async function fetchAllReservations(): Promise<Record<number, Reservation>> {
  const { data, error } = await supabase.from("reservations").select("*");
  if (error) throw error;
  const byTable: Record<number, Reservation> = {};
  for (const row of (data ?? []) as ReservationRow[]) {
    const reservation = rowToReservation(row);
    byTable[reservation.tableNumber] = reservation;
  }
  return byTable;
}

export async function upsertReservation(reservation: Reservation): Promise<void> {
  const { error } = await supabase
    .from("reservations")
    .upsert(reservationToRow(reservation), { onConflict: "table_number" });
  if (error) throw error;
}

export async function deleteReservation(tableNumber: number): Promise<void> {
  const { error } = await supabase.from("reservations").delete().eq("table_number", tableNumber);
  if (error) throw error;
}

// Any insert/update/delete on the table triggers a full refetch rather than
// patching the changed row from the realtime payload - simpler, and cheap
// since this table only ever holds one row per table number (a few dozen
// at most).
export function subscribeToReservations(
  onChange: (byTable: Record<number, Reservation>) => void,
  onStatusChange: (status: RealtimeConnectionStatus) => void,
): () => void {
  const channel = supabase
    .channel("reservations-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => {
      fetchAllReservations()
        .then(onChange)
        .catch(() => {
          // A transient refetch failure here just misses this one realtime
          // event; the next change (or reconnect) catches the table back up.
        });
    })
    .subscribe((status) => {
      onStatusChange(status === "SUBSCRIBED" ? "connected" : "disconnected");
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
```

- [ ] **Step 6: Verify the full check suite passes**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass. (No live Supabase calls happen during these checks — `fetchAllReservations`/`upsertReservation`/etc. are only type-checked, never invoked, since nothing imports `lib/reservationsStore.ts` yet.)

- [ ] **Step 7: Commit**

```bash
git add lib/reservationRows.ts lib/reservationsStore.ts tests/reservationRows.test.ts
git commit -m "Add Supabase-backed reservations persistence module"
```

---

### Task 4: Server roster persistence module (pure mapping + Supabase network calls)

**Files:**
- Create: `lib/serverRows.ts`
- Modify: `lib/servers.ts` (full rewrite)
- Test: `tests/serverRows.test.ts`
- Delete: `tests/servers.test.ts` (tests the `loadServerNames`/`saveServerNames` functions this task removes)

**Interfaces:**
- Consumes: `supabase` from `lib/supabaseClient.ts` (Task 1).
- Produces:
  - `MAX_SERVERS: number`, `ServerRow` interface, `rowsToServerNames(rows: ServerRow[]): string[]` — pure, from `lib/serverRows.ts`.
  - `MAX_SERVERS` (re-exported), `RealtimeConnectionStatus`, `fetchServerNames(): Promise<string[]>`, `setServerNameRemote(index: number, name: string): Promise<void>`, `subscribeToServers(onChange: (names: string[]) => void, onStatusChange: (status: RealtimeConnectionStatus) => void): () => void` — from `lib/servers.ts`. Task 6 consumes all of these.

- [ ] **Step 1: Delete the obsolete test file**

```bash
git rm tests/servers.test.ts
```

This file tests `loadServerNames`/`saveServerNames`, which this task removes from `lib/servers.ts`. Deleting it now (rather than at the end of the task) keeps `npm run test` green at every subsequent step.

- [ ] **Step 2: Write the failing tests for the pure mapping function**

Create `tests/serverRows.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_SERVERS, rowsToServerNames, type ServerRow } from "../lib/serverRows.ts";

test("rowsToServerNames: empty rows return 5 empty slots", () => {
  assert.deepEqual(rowsToServerNames([]), ["", "", "", "", ""]);
});

test("rowsToServerNames: places each row's name at its slot_index", () => {
  const rows: ServerRow[] = [
    { slot_index: 2, name: "Jordan" },
    { slot_index: 0, name: "Alex" },
    { slot_index: 1, name: "Sam" },
  ];
  assert.deepEqual(rowsToServerNames(rows), ["Alex", "Sam", "Jordan", "", ""]);
});

test("rowsToServerNames: pads any slot missing from the rows with \"\"", () => {
  const rows: ServerRow[] = [{ slot_index: 4, name: "Casey" }];
  assert.deepEqual(rowsToServerNames(rows), ["", "", "", "", "Casey"]);
});

test("rowsToServerNames: always returns MAX_SERVERS entries", () => {
  const rows: ServerRow[] = Array.from({ length: MAX_SERVERS }, (_, index) => ({
    slot_index: index,
    name: `Server ${index}`,
  }));
  assert.equal(rowsToServerNames(rows).length, MAX_SERVERS);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run test`
Expected: FAIL — `lib/serverRows.ts` does not exist yet (module not found).

- [ ] **Step 4: Implement the pure mapping module**

Create `lib/serverRows.ts`:

```typescript
// A short, fixed-size roster the admin fills in once (e.g. "Alex", "Sam")
// so staff pick a server from a dropdown instead of retyping a name on
// every reservation. Slots start empty - nothing to configure up front.
export const MAX_SERVERS = 5;

export interface ServerRow {
  slot_index: number;
  name: string;
}

// Postgres doesn't guarantee row order without an explicit ORDER BY, and a
// slot could in principle be missing (e.g. the seed insert hasn't run yet)
// - this always returns exactly MAX_SERVERS entries in slot order, padding
// any missing slot with "".
export function rowsToServerNames(rows: ServerRow[]): string[] {
  const byIndex = new Map(rows.map((row) => [row.slot_index, row.name]));
  return Array.from({ length: MAX_SERVERS }, (_, index) => byIndex.get(index) ?? "");
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test`
Expected: PASS — all 4 new tests green.

- [ ] **Step 6: Rewrite the network module**

Replace the entire contents of `lib/servers.ts` with:

```typescript
import { supabase } from "./supabaseClient";
import { MAX_SERVERS, rowsToServerNames, type ServerRow } from "./serverRows";

export { MAX_SERVERS };

export type RealtimeConnectionStatus = "connected" | "disconnected";

export async function fetchServerNames(): Promise<string[]> {
  const { data, error } = await supabase.from("servers").select("*");
  if (error) throw error;
  return rowsToServerNames((data ?? []) as ServerRow[]);
}

export async function setServerNameRemote(index: number, name: string): Promise<void> {
  const { error } = await supabase
    .from("servers")
    .upsert({ slot_index: index, name }, { onConflict: "slot_index" });
  if (error) throw error;
}

export function subscribeToServers(
  onChange: (names: string[]) => void,
  onStatusChange: (status: RealtimeConnectionStatus) => void,
): () => void {
  const channel = supabase
    .channel("servers-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "servers" }, () => {
      fetchServerNames()
        .then(onChange)
        .catch(() => {
          // Same reasoning as reservationsStore's subscribe: a missed
          // refetch here just skips one realtime event.
        });
    })
    .subscribe((status) => {
      onStatusChange(status === "SUBSCRIBED" ? "connected" : "disconnected");
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
```

- [ ] **Step 7: Verify the full check suite passes**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: `lint` and `test` pass — no test file imports `lib/useServerRoster.ts` (hooks aren't unit-tested in this project, so the broken import below is invisible to `test`). `typecheck` fails with exactly one error, in `lib/useServerRoster.ts`: it still imports `loadServerNames`/`saveServerNames` from `./servers`, which this task's rewrite no longer exports — expected, fixed in Task 6, not here. Confirm that's the only typecheck error (not inside `lib/servers.ts` or `lib/serverRows.ts` themselves).

- [ ] **Step 8: Commit**

```bash
git add lib/serverRows.ts lib/servers.ts tests/serverRows.test.ts tests/servers.test.ts
git commit -m "Add Supabase-backed server roster persistence module"
```

---

### Task 5: Rewrite `useReservations` around the Supabase store

**Files:**
- Modify: `lib/useReservations.ts` (full rewrite)

**Interfaces:**
- Consumes: `fetchAllReservations`, `upsertReservation`, `deleteReservation`, `subscribeToReservations` from `lib/reservationsStore.ts` (Task 3); `computeFinalTime`, `statusFor`, `summarizeStatuses`, `updateReservationFields` from `lib/reservations.ts` (existing); `ALL_TABLE_NUMBERS` from `lib/tables.ts` (existing).
- Produces: `UseReservationsResult` with fields `reservationsByTable: Record<number, Reservation>`, `now: Date`, `isLoading: boolean`, `isConnected: boolean`, `loadError: string | null`, `getStatus: (tableNumber: number) => ReservationStatus`, `summary: StatusSummary`, `saveReservation: (tableNumber: number, input: ReservationInput) => Promise<void>`, `seatTable: (tableNumber: number, startTime: string) => Promise<void>`, `clearTable: (tableNumber: number) => Promise<void>`, `retry: () => void`. Tasks 7 and 8 consume this exact shape (note `isPersistent` is gone, replaced by `isLoading`/`isConnected`/`loadError`/`retry`, and `saveReservation`/`seatTable`/`clearTable` are now async).

- [ ] **Step 1: Replace the hook**

Replace the entire contents of `lib/useReservations.ts` with:

```typescript
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeFinalTime,
  statusFor,
  summarizeStatuses,
  updateReservationFields,
  type Reservation,
  type ReservationInput,
  type ReservationStatus,
  type StatusSummary,
} from "./reservations";
import { ALL_TABLE_NUMBERS } from "./tables";
import {
  deleteReservation,
  fetchAllReservations,
  subscribeToReservations,
  upsertReservation,
} from "./reservationsStore";

const POLL_INTERVAL_MS = 30_000;

export interface UseReservationsResult {
  reservationsByTable: Record<number, Reservation>;
  now: Date;
  isLoading: boolean;
  isConnected: boolean;
  loadError: string | null;
  getStatus: (tableNumber: number) => ReservationStatus;
  summary: StatusSummary;
  saveReservation: (tableNumber: number, input: ReservationInput) => Promise<void>;
  seatTable: (tableNumber: number, startTime: string) => Promise<void>;
  clearTable: (tableNumber: number) => Promise<void>;
  retry: () => void;
}

export function useReservations(): UseReservationsResult {
  const [reservationsByTable, setReservationsByTable] = useState<Record<number, Reservation>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [retryToken, setRetryToken] = useState(0);

  // Initial fetch + realtime subscription for this hook's lifetime. Reruns
  // on retry() (a failed initial load) but never on its own after that -
  // subsequent updates arrive via the realtime subscription, not a refetch
  // of this effect.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    fetchAllReservations()
      .then((byTable) => {
        if (!cancelled) {
          setReservationsByTable(byTable);
          setIsLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load reservations.");
          setIsLoading(false);
        }
      });

    const unsubscribe = subscribeToReservations(
      (byTable) => {
        if (!cancelled) setReservationsByTable(byTable);
      },
      (status) => {
        if (!cancelled) setIsConnected(status === "connected");
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [retryToken]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Each mutation applies its change to local state immediately (so the
  // initiating device feels instant) and rolls back if the Supabase write
  // fails - the caller (ReservationPanel) catches the rethrown error to
  // show an inline message. Rollback uses the functional setState form and
  // restores only the one affected table key (not the whole map captured
  // before the mutation) so a realtime update for a different table - or
  // this device's own separately-succeeded mutation - arriving while this
  // write is in flight isn't silently discarded by the failure's rollback.
  const saveReservation = useCallback(
    async (tableNumber: number, input: ReservationInput) => {
      const existing = reservationsByTable[tableNumber];
      const reservation = updateReservationFields(existing, tableNumber, input);
      setReservationsByTable((current) => ({ ...current, [tableNumber]: reservation }));
      try {
        await upsertReservation(reservation);
      } catch (error) {
        setReservationsByTable((current) => {
          const next = { ...current };
          if (existing) {
            next[tableNumber] = existing;
          } else {
            delete next[tableNumber];
          }
          return next;
        });
        throw error;
      }
    },
    [reservationsByTable],
  );

  const seatTable = useCallback(
    async (tableNumber: number, startTime: string) => {
      const existing = reservationsByTable[tableNumber];
      if (!existing) return;
      const updated: Reservation = {
        ...existing,
        startTime,
        finalTime: computeFinalTime(startTime, existing.timeLimitMinutes),
      };
      setReservationsByTable((current) => ({ ...current, [tableNumber]: updated }));
      try {
        await upsertReservation(updated);
      } catch (error) {
        setReservationsByTable((current) => ({ ...current, [tableNumber]: existing }));
        throw error;
      }
    },
    [reservationsByTable],
  );

  const clearTable = useCallback(
    async (tableNumber: number) => {
      const existing = reservationsByTable[tableNumber];
      setReservationsByTable((current) => {
        const next = { ...current };
        delete next[tableNumber];
        return next;
      });
      try {
        await deleteReservation(tableNumber);
      } catch (error) {
        if (existing) {
          setReservationsByTable((current) => ({ ...current, [tableNumber]: existing }));
        }
        throw error;
      }
    },
    [reservationsByTable],
  );

  const retry = useCallback(() => setRetryToken((token) => token + 1), []);

  const summary = useMemo(
    () => summarizeStatuses(reservationsByTable, ALL_TABLE_NUMBERS, now),
    [reservationsByTable, now],
  );

  return {
    reservationsByTable,
    now,
    isLoading,
    isConnected,
    loadError,
    getStatus: (tableNumber: number) => statusFor(reservationsByTable[tableNumber], now),
    summary,
    saveReservation,
    seatTable,
    clearTable,
    retry,
  };
}
```

- [ ] **Step 2: Verify the full check suite passes**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: `lint` and `test` pass. `typecheck` fails in exactly two places: `app/page.tsx` and `app/staff/page.tsx`, both still destructuring `isPersistent`, a field `UseReservationsResult` no longer has (replaced by `isLoading`/`isConnected`/`loadError`/`retry`) — fixed in Task 7. `lib/useServerRoster.ts` also still fails typecheck, carried over unfixed from Task 4 (it imports `loadServerNames`/`saveServerNames`, which `lib/servers.ts` no longer exports) — fixed in Task 6, not a regression introduced here. `components/ReservationPanel.tsx` is unaffected by this task and should still typecheck cleanly: its props aren't touched until Task 8, and TypeScript already allows a `Promise`-returning function where a `void`-returning one is expected, so passing the now-async `saveReservation`/`seatTable`/`clearTable` through unchanged prop types doesn't itself error. Confirm the typecheck errors are exactly those two carried-over/introduced ones, nothing in `lib/useReservations.ts` or `components/ReservationPanel.tsx`.

- [ ] **Step 3: Commit**

```bash
git add lib/useReservations.ts
git commit -m "Rewrite useReservations around the Supabase-backed store"
```

---

### Task 6: Rewrite `useServerRoster` around the Supabase store

**Files:**
- Modify: `lib/useServerRoster.ts` (full rewrite)

**Interfaces:**
- Consumes: `MAX_SERVERS`, `fetchServerNames`, `setServerNameRemote`, `subscribeToServers` from `lib/servers.ts` (Task 4).
- Produces: `UseServerRosterResult` with fields `serverNames: string[]`, `isConnected: boolean`, `setServerName: (index: number, name: string) => Promise<void>`. Tasks 7 and 8 consume this exact shape (`setServerName` is now async).

- [ ] **Step 1: Replace the hook**

Replace the entire contents of `lib/useServerRoster.ts` with:

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import { MAX_SERVERS, fetchServerNames, setServerNameRemote, subscribeToServers } from "./servers";

export interface UseServerRosterResult {
  serverNames: string[];
  isConnected: boolean;
  setServerName: (index: number, name: string) => Promise<void>;
}

export function useServerRoster(): UseServerRosterResult {
  const [serverNames, setServerNames] = useState<string[]>(() => Array(MAX_SERVERS).fill(""));
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchServerNames()
      .then((names) => {
        if (!cancelled) setServerNames(names);
      })
      .catch(() => {
        // A failed initial fetch leaves the roster at its all-empty
        // default; the dropdown just shows "Unassigned" until the next
        // successful sync. Not surfaced as a blocking error - the server
        // roster isn't essential to using the rest of the app.
      });

    const unsubscribe = subscribeToServers(
      (names) => {
        if (!cancelled) setServerNames(names);
      },
      (status) => {
        if (!cancelled) setIsConnected(status === "connected");
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const setServerName = useCallback(
    async (index: number, name: string) => {
      const previous = serverNames[index];
      setServerNames((current) => {
        const next = [...current];
        next[index] = name;
        return next;
      });
      try {
        await setServerNameRemote(index, name);
      } catch (error) {
        // Scoped to this one slot (not the whole array) so a realtime
        // update to a different slot that arrived while this write was in
        // flight isn't discarded by the rollback — same reasoning as
        // useReservations' per-table rollback.
        setServerNames((current) => {
          const next = [...current];
          next[index] = previous;
          return next;
        });
        throw error;
      }
    },
    [serverNames],
  );

  return { serverNames, isConnected, setServerName };
}
```

- [ ] **Step 2: Verify the full check suite passes**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: `lint` and `test` pass. `typecheck` fails in exactly the same two places as after Task 5 — `app/page.tsx` and `app/staff/page.tsx`, both still destructuring the removed `isPersistent` field — fixed in Task 7. This task's own rewrite should have cleared the `lib/useServerRoster.ts` error that existed since Task 4. `ReservationPanel`'s `onSetServerName` prop never needs to change (it stays `(index: number, name: string) => void`, and TypeScript allows the now-async `setServerName` to satisfy that void-returning type), so `components/ReservationPanel.tsx` is not a source of errors at this or any later checkpoint. Confirm the two `isPersistent` errors are the only ones remaining.

- [ ] **Step 3: Commit**

```bash
git add lib/useServerRoster.ts
git commit -m "Rewrite useServerRoster around the Supabase-backed store"
```

---

### Task 7: Update the admin and staff pages for loading/connection/error states

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/staff/page.tsx`

**Interfaces:**
- Consumes: `UseReservationsResult` from Task 5 (`isLoading`, `isConnected`, `loadError`, `retry` replace `isPersistent`); `UseServerRosterResult` from Task 6 (unchanged field names, `setServerName` now returns a `Promise<void>`, which `ReservationPanel`'s `onSetServerName` prop does not need to await — see Task 8).

- [ ] **Step 1: Update `app/page.tsx`**

Replace the file's contents with:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useReservations } from "@/lib/useReservations";
import { useServerRoster } from "@/lib/useServerRoster";
import { StatusSummary } from "@/components/StatusSummary";
import { FloorPlan } from "@/components/FloorPlan";
import { ReservationPanel } from "@/components/ReservationPanel";

export default function Home() {
  const {
    reservationsByTable,
    isLoading,
    isConnected,
    loadError,
    getStatus,
    summary,
    now,
    saveReservation,
    seatTable,
    clearTable,
    retry,
  } = useReservations();
  const { serverNames, setServerName } = useServerRoster();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">Elena&apos;s Restaurant - West Portal</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Bar and main dining floor plan</p>
          {!isLoading && !loadError && !isConnected && (
            <p className="mt-2 rounded-md bg-[var(--color-overdue-bg)] px-3 py-2 text-sm text-[var(--color-overdue-text)]">
              Reconnecting to the shared reservation data &mdash; changes from other devices may not
              appear until this comes back.
            </p>
          )}
        </div>
        <Link
          href="/staff"
          className="whitespace-nowrap text-sm font-medium text-[var(--color-accent)] underline"
        >
          View as staff →
        </Link>
      </header>

      {loadError ? (
        <div className="rounded-md border border-[var(--color-overdue-border)] bg-[var(--color-overdue-bg)] p-4 text-[var(--color-overdue-text)]">
          <p className="font-medium">Couldn&apos;t load reservations: {loadError}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded-md border border-current px-3 py-1.5 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading reservations…</p>
      ) : (
        <>
          <StatusSummary summary={summary} />

          <FloorPlan
            reservationsByTable={reservationsByTable}
            getStatus={getStatus}
            now={now}
            onSelectTable={setSelectedTable}
          />

          <ReservationPanel
            tableNumber={selectedTable}
            reservation={selectedTable !== null ? reservationsByTable[selectedTable] : undefined}
            serverNames={serverNames}
            onSetServerName={setServerName}
            onSave={(tableNumber, input) => saveReservation(tableNumber, input)}
            onSeat={(tableNumber, startTime) => seatTable(tableNumber, startTime)}
            onClear={async (tableNumber) => {
              await clearTable(tableNumber);
              setSelectedTable(null);
            }}
            onClose={() => setSelectedTable(null)}
          />
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Update `app/staff/page.tsx`**

Replace the file's contents with:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useReservations } from "@/lib/useReservations";
import { StatusSummary } from "@/components/StatusSummary";
import { FloorPlan } from "@/components/FloorPlan";
import { ReservationDetails } from "@/components/ReservationDetails";

// Read-only mirror of the admin page ("/"): same live data via the same
// hook, same floor plan, but selecting a table opens ReservationDetails
// instead of ReservationPanel - no add/edit/seat/clear controls anywhere
// on this page.
export default function StaffView() {
  const { reservationsByTable, isLoading, isConnected, loadError, getStatus, summary, now, retry } =
    useReservations();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">Elena&apos;s Restaurant - West Portal</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Staff view — click a table to see its details</p>
          {!isLoading && !loadError && !isConnected && (
            <p className="mt-2 rounded-md bg-[var(--color-overdue-bg)] px-3 py-2 text-sm text-[var(--color-overdue-text)]">
              Reconnecting to the shared reservation data &mdash; this view may be stale until it
              comes back.
            </p>
          )}
        </div>
        <Link
          href="/"
          className="whitespace-nowrap text-sm font-medium text-[var(--color-accent)] underline"
        >
          Admin view →
        </Link>
      </header>

      {loadError ? (
        <div className="rounded-md border border-[var(--color-overdue-border)] bg-[var(--color-overdue-bg)] p-4 text-[var(--color-overdue-text)]">
          <p className="font-medium">Couldn&apos;t load reservations: {loadError}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded-md border border-current px-3 py-1.5 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading reservations…</p>
      ) : (
        <>
          <StatusSummary summary={summary} />

          <FloorPlan
            reservationsByTable={reservationsByTable}
            getStatus={getStatus}
            now={now}
            onSelectTable={setSelectedTable}
          />

          <ReservationDetails
            tableNumber={selectedTable}
            reservation={selectedTable !== null ? reservationsByTable[selectedTable] : undefined}
            status={selectedTable !== null ? getStatus(selectedTable) : "available"}
            now={now}
            onClose={() => setSelectedTable(null)}
          />
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify the full check suite passes**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: all four pass — this task clears the last two `isPersistent` errors, so the full check suite (including `build`) is fully green again here. That does *not* mean Task 8 is unnecessary: `ReservationPanel` still has no way to show a failed save/seat/clear to the user (the spec's Error Handling section requires an inline error on a failed mutation), which is what Task 8 adds — its prop-type update documents the async contract in the types but isn't itself what makes anything compile.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/staff/page.tsx
git commit -m "Add loading/connection/error states to admin and staff pages"
```

---

### Task 8: Update `ReservationPanel` for async mutations and error display

**Files:**
- Modify: `components/ReservationPanel.tsx`

**Interfaces:**
- Consumes: `onSave: (tableNumber: number, input: ReservationInput) => Promise<void>`, `onSeat: (tableNumber: number, startTime: string) => Promise<void>`, `onClear: (tableNumber: number) => Promise<void>` (from Task 7's `app/page.tsx` wiring, which forwards Task 5's now-async `saveReservation`/`seatTable`/`clearTable`).

- [ ] **Step 1: Update the props interface**

In `components/ReservationPanel.tsx`, change:

```typescript
interface ReservationPanelProps {
  tableNumber: number | null;
  reservation: Reservation | undefined;
  serverNames: string[];
  onSetServerName: (index: number, name: string) => void;
  onSave: (tableNumber: number, input: ReservationInput) => void;
  onSeat: (tableNumber: number, startTime: string) => void;
  onClear: (tableNumber: number) => void;
  onClose: () => void;
}
```

to:

```typescript
interface ReservationPanelProps {
  tableNumber: number | null;
  reservation: Reservation | undefined;
  serverNames: string[];
  onSetServerName: (index: number, name: string) => void;
  onSave: (tableNumber: number, input: ReservationInput) => Promise<void>;
  onSeat: (tableNumber: number, startTime: string) => Promise<void>;
  onClear: (tableNumber: number) => Promise<void>;
  onClose: () => void;
}
```

- [ ] **Step 2: Add a `saveError` state and reset it alongside the existing per-table reset**

Change:

```typescript
  const [errors, setErrors] = useState<ReturnType<typeof validateReservationInput>["errors"]>({});
  const [editingServerList, setEditingServerList] = useState(false);
```

to:

```typescript
  const [errors, setErrors] = useState<ReturnType<typeof validateReservationInput>["errors"]>({});
  const [editingServerList, setEditingServerList] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
```

And change the end of the table-change effect from:

```typescript
    setErrors({});
  }, [tableNumber, reservation]);
```

to:

```typescript
    setErrors({});
    setSaveError(null);
  }, [tableNumber, reservation]);
```

- [ ] **Step 3: Replace `handleSave` with async save/seat/clear handlers**

Change:

```typescript
  function handleSave() {
    const result = validateReservationInput(input);
    setErrors(result.errors);
    if (result.valid) {
      onSave(tableNumber as number, input);
    }
  }
```

to:

```typescript
  async function handleSave() {
    const result = validateReservationInput(input);
    setErrors(result.errors);
    if (!result.valid) return;
    setSaveError(null);
    try {
      await onSave(tableNumber as number, input);
    } catch {
      setSaveError("Couldn't save — check your connection and try again.");
    }
  }

  async function handleSeat() {
    setSaveError(null);
    try {
      await onSeat(tableNumber as number, startTime);
    } catch {
      setSaveError("Couldn't seat this table — check your connection and try again.");
    }
  }

  async function handleClear() {
    setSaveError(null);
    try {
      await onClear(tableNumber as number);
    } catch {
      setSaveError("Couldn't clear this table — check your connection and try again.");
    }
  }
```

- [ ] **Step 4: Wire the Save button's error message, and point Seat/Clear at the new handlers**

Change:

```tsx
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 font-medium text-white hover:bg-[var(--color-accent-hover)]"
        >
          {reservation ? "Save changes" : "Add reservation"}
        </button>
```

to:

```tsx
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 font-medium text-white hover:bg-[var(--color-accent-hover)]"
        >
          {reservation ? "Save changes" : "Add reservation"}
        </button>

        {saveError && <p className="text-sm text-[var(--color-overdue-text)]">{saveError}</p>}
```

Change:

```tsx
          <button
            type="button"
            disabled={!reservation}
            onClick={() => onSeat(tableNumber as number, startTime)}
            className="mt-2 w-full rounded-md border border-[var(--color-accent)] px-4 py-2 font-medium text-[var(--color-accent)] disabled:opacity-40"
          >
            Seat now
          </button>
```

to:

```tsx
          <button
            type="button"
            disabled={!reservation}
            onClick={handleSeat}
            className="mt-2 w-full rounded-md border border-[var(--color-accent)] px-4 py-2 font-medium text-[var(--color-accent)] disabled:opacity-40"
          >
            Seat now
          </button>
```

Change:

```tsx
        {reservation && (
          <button
            type="button"
            onClick={() => onClear(tableNumber as number)}
            className="mt-auto rounded-md border border-[var(--color-overdue-border)] px-4 py-2 font-medium text-[var(--color-overdue-text)]"
          >
            Clear table
          </button>
        )}
```

to:

```tsx
        {reservation && (
          <button
            type="button"
            onClick={handleClear}
            className="mt-auto rounded-md border border-[var(--color-overdue-border)] px-4 py-2 font-medium text-[var(--color-overdue-text)]"
          >
            Clear table
          </button>
        )}
```

- [ ] **Step 5: Verify the full check suite passes, including build**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: all four pass (the suite was already green after Task 7; this confirms this task's prop-type and error-handling changes didn't regress it). `build` prerenders `/` and `/staff`, which import `lib/supabaseClient.ts` at build time, so this step also reconfirms `.env.local` (Task 1) is set up correctly locally.

- [ ] **Step 6: Commit**

```bash
git add components/ReservationPanel.tsx
git commit -m "Make ReservationPanel's save/seat/clear async with error display"
```

**Amendment (found in the final whole-branch review, commits 3835165, 665fca9, 8205c6a):** the code above has the reset `useEffect` depending on `[tableNumber, reservation]`. This is a real bug: `reservation` gets a brand-new object identity on *every* realtime change to *any* table (the whole floor is refetched on each change, per Task 3's `subscribeToReservations`), so the effect re-fires on unrelated devices' actions — silently wiping in-progress edits, wiping the whole form on a failed save right as the error should show, and clearing that same error via the effect's own `setSaveError(null)`. The fix narrows the effect's dependency array to `[tableNumber]` only (still reading `reservation` fresh inside the body — safe, since the parent updates both props together on a genuine table switch). The same final review also found the server-roster `onSetServerName` call site had no error handling for a failed write (unhandled rejection) and wrote to Supabase on every keystroke (risking a stale-echo revert race under latency) — fixed by buffering edits in local `draftServerNames` state and committing on blur via a new `handleServerNameCommit` handler, with a `serverNameError` state displayed unconditionally (not gated on whether the roster-editing view happens to be open — an oversight in the first attempt at this same fix, caught by the fix's own scoped re-review). See `components/ReservationPanel.tsx` for the final, verified code — reproducing it here in full would just duplicate the file.

---

### Task 9: Retire the localStorage persistence layer and wire up deployment

**Files:**
- Delete: `lib/store.ts`
- Delete: `tests/store.test.ts`
- Modify: `.github/workflows/deploy.yml`
- Modify: `README.md`

**Interfaces:**
- None — this task removes dead code and updates configuration/docs; no other task depends on anything produced here.

- [ ] **Step 1: Confirm nothing still imports `lib/store.ts`**

Run: `grep -rn "from \"./store\"\|from \"@/lib/store\"\|lib/store" --include="*.ts" --include="*.tsx" lib app components tests | grep -v "tests/store.test.ts"`
Expected: no output. (By this point Tasks 3-6 have removed every consumer; `tests/store.test.ts` is the only remaining reference, and this task deletes it in the same step as `lib/store.ts`.)

- [ ] **Step 2: Delete the retired files**

```bash
git rm lib/store.ts tests/store.test.ts
```

- [ ] **Step 3: Verify the full check suite passes**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: all pass.

- [ ] **Step 4: Add the Supabase env vars to the deploy workflow**

In `.github/workflows/deploy.yml`, change:

```yaml
      - name: Build static export
        run: npm run build
        env:
          # actions/configure-pages figures out the correct /repo-name
          # prefix for a project site — next.config.mjs reads this to set
          # basePath. Locally this env var is unset, so basePath is "".
          PAGES_BASE_PATH: ${{ steps.pages.outputs.base_path }}
```

to:

```yaml
      - name: Build static export
        run: npm run build
        env:
          # actions/configure-pages figures out the correct /repo-name
          # prefix for a project site — next.config.mjs reads this to set
          # basePath. Locally this env var is unset, so basePath is "".
          PAGES_BASE_PATH: ${{ steps.pages.outputs.base_path }}
          # NEXT_PUBLIC_* values get baked in at build time (static
          # export has no server to read env vars at runtime), so these
          # must be set here, not just in each developer's .env.local.
          # Set as repository variables under Settings → Secrets and
          # variables → Actions → Variables — see README's Setup section.
          NEXT_PUBLIC_SUPABASE_URL: ${{ vars.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ vars.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

- [ ] **Step 5: Update the README**

In `README.md`:

Change the opening paragraph from:

```markdown
A single-restaurant table reservation dashboard for front-of-house staff.
Color-coded floor plan — laid out to match the restaurant's actual
seating chart — where employees can add, seat, and clear reservations,
with a live counter of minutes seated on occupied tables. This is a
click-through demo: no backend, no login — all data is saved to your
browser's `localStorage`.
```

to:

```markdown
A single-restaurant table reservation dashboard for front-of-house staff.
Color-coded floor plan — laid out to match the restaurant's actual
seating chart — where employees can add, seat, and clear reservations,
with a live counter of minutes seated on occupied tables. Reservation
and server-roster data is shared across every device in real time via
Supabase — a change made on one tablet appears on every other open
tablet or phone within about a second. Still no login: anyone with the
URL can view and edit, same as before.
```

Change the "## Checks" section's `npm run test` line from:

```markdown
npm run test        # unit tests for lib/tables.ts (incl. isWideTable), lib/reservations.ts (incl. minutesSince), lib/store.ts
```

to:

```markdown
npm run test        # unit tests for lib/tables.ts, lib/reservations.ts, lib/reservationRows.ts, lib/serverRows.ts
```

Change the "## Deployment" section's first paragraph from:

```markdown
Pushing to `main` builds the app as a static export (`next build` with
`output: "export"`, no server needed since everything runs against
`localStorage`) and publishes it to GitHub Pages via
`.github/workflows/deploy.yml`. The live URL is under the repo's
**Settings → Pages** once the first deploy finishes.
```

to:

```markdown
Pushing to `main` builds the app as a static export (`next build` with
`output: "export"`) and publishes it to GitHub Pages via
`.github/workflows/deploy.yml`. The build step needs
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` available
as GitHub Actions **repository variables** (Settings → Secrets and
variables → Actions → Variables tab) — see `.env.example` for what they
are. The live URL is under the repo's **Settings → Pages** once the
first deploy finishes.
```

Remove the "Real database / multi-device sync" bullet from the "## What's not built yet" section — change:

```markdown
## What's not built yet (see docs/superpowers/specs for the full design)

- Real database / multi-device sync — right now state is per-browser only.
- Real employee accounts / login — the `/staff` page has no editing UI, but
  it isn't access-controlled; anyone with the URL can view it.
- Multi-restaurant support.
```

to:

```markdown
## What's not built yet (see docs/superpowers/specs for the full design)

- Real employee accounts / login — the `/staff` page has no editing UI, but
  it isn't access-controlled; anyone with the URL can view it.
- Offline support — if a device can't reach Supabase it shows a clear
  disconnected/error state, but changes made while offline aren't queued.
- Multi-restaurant support.
```

- [ ] **Step 6: Commit**

```bash
git add lib/store.ts tests/store.test.ts .github/workflows/deploy.yml README.md
git commit -m "Retire localStorage persistence; wire Supabase env vars into deploy"
```

(`lib/store.ts` and `tests/store.test.ts` are already staged as deletions from Step 2 — `git add` on a deleted path stages the deletion.)

---

### Task 10: Live multi-device QA (controller-led, not a dispatched subagent)

This task has no code changes — it's the manual verification the spec calls for, and per this project's established constraint, no agent drives a live browser for QA; the user clicks through it.

**Prerequisites before starting this task:**
- `supabase/schema.sql` (Task 2) has been run against the live Supabase project.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set as GitHub Actions repository variables (needed only if testing the deployed GitHub Pages site, not for local QA).
- All of Tasks 1-9 are merged and `npm run build` succeeds.

- [ ] **Step 1: Local two-tab smoke test**

Run `npm run dev`, open `http://localhost:3000` (admin) in one browser tab and `http://localhost:3000/staff` (staff) in another. In the admin tab: add a reservation to an available table, then seat it, then clear it. After each action, confirm the staff tab reflects the change within about a second with no manual refresh.

- [ ] **Step 2: Server roster sync check**

In the admin tab, open a table's panel, click "Edit server list", and set one slot's name. Confirm the dropdown in a second admin tab (or after reopening the panel) shows the new name without a page reload.

- [ ] **Step 3: Disconnected-state check**

With the admin tab open, turn off Wi-Fi (or use DevTools' Network throttling set to "Offline"). Confirm the "Reconnecting…" banner appears. Turn Wi-Fi back on and confirm the banner clears on its own and a new change made from another device still shows up.

- [ ] **Step 4: Error-state check**

Temporarily set an invalid value in `.env.local` for `NEXT_PUBLIC_SUPABASE_ANON_KEY` (e.g. append a few characters), restart `npm run dev`, reload the page, and confirm the "Couldn't load reservations" error message and Retry button appear instead of a blank or crashed page. Restore the correct value afterward.

- [ ] **Step 5: Deployed-site check (only after the GitHub Actions repository variables are set)**

Push to `main`, wait for the GitHub Actions workflow to finish, then repeat Step 1 against the live GitHub Pages URL from two different devices (e.g. a laptop and a phone) to confirm real cross-device sync, not just cross-tab sync on one machine.

- [ ] **Step 6: Report results**

Report back which checks passed and which didn't, with enough detail (which step, what was expected vs. observed) to debug anything that failed.
