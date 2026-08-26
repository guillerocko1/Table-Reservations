# Realtime Multi-Device Sync — Design Spec

**Date:** 2026-08-26
**Status:** Approved for planning
**Author:** Claude Code (with Guillermo Ayala)

## Overview

Today, both the admin view (`/`) and the staff view (`/staff`) read and
write reservation data through `localStorage`, so each browser/device has
its own independent copy. A change an admin makes on one tablet is
invisible to a staff member's phone or a second tablet. This spec replaces
that per-device storage with a shared Supabase (Postgres) backend, with
Supabase Realtime pushing every change to all connected devices within
about a second — no manual refresh needed.

The existing GitHub Pages deployment (a static export, no server) keeps
working exactly as it is today: the browser talks directly to Supabase's
hosted API over HTTPS/WebSocket, so there's still nothing for GitHub Pages
itself to run beyond static files.

**Supabase project:** `https://xwilvwkdlybrrvfhlvow.supabase.co` (already
created by Guillermo).

## Goals

- A reservation added, seated, edited, or cleared on any device appears on
  every other open device within about a second, with no refresh.
- The same for the 5-slot server roster.
- Keep the current GitHub Pages static deployment — no server/API layer to
  build or host.
- Make it obvious to staff when their view might be stale (connection
  lost) rather than silently showing outdated data.

## Non-Goals (explicitly out of scope for this change)

- **Authentication / access control.** Per Guillermo's decision, this stays
  fully open — anyone with either URL can view and edit, same trust model
  as today, just now shared across devices instead of per-browser. Revisit
  if that stops being acceptable (see Future Improvements).
- **Offline support.** If the device can't reach Supabase, the app shows a
  clear disconnected/error state. No local queueing of changes made while
  offline, no conflict resolution when reconnecting.
- **Migrating existing `localStorage` data.** Each browser's current local
  data is independent and there's no single "correct" copy to promote into
  the shared database — the shared database starts empty. Anyone testing
  the demo starts fresh.
- **Rate limiting / abuse protection.** Because access is open, anyone with
  the URL can write to the shared database directly (not just through the
  UI). Accepted risk for now, matching the "keep it open for now" decision.
- **Visual/UI redesign.** This is a persistence-layer swap; the floor
  plan, forms, and colors are unchanged except for a new connection-status
  indicator (see Error Handling).

## Tech Stack

Adds to the existing stack: `@supabase/supabase-js` (the only new runtime
dependency), talking to a Supabase Postgres database with Realtime enabled
on its tables. No other new services.

## Data Model

Two tables, replacing the two `localStorage` keys:

```sql
create table reservations (
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
  updated_at         timestamptz not null default now()
);

create table servers (
  slot_index integer primary key check (slot_index >= 0 and slot_index < 5),
  name       text not null default ''
);
```

`reservations` has no row for an Available table — clearing a table
deletes its row, matching the app's existing "delete the info, ready for a
new reservation" behavior. `servers` is seeded with 5 rows
(`slot_index` 0-4, empty `name`) once at setup.

Both tables get Row Level Security **enabled** (not disabled) with an
explicit permissive policy allowing the anon role full
select/insert/update/delete. Enabling RLS with an open policy — rather
than leaving RLS off — means tightening access later (see Future
Improvements) is a policy change, not a structural one.

Both tables are added to the `supabase_realtime` publication so Realtime
can broadcast their changes.

## Client Architecture

`lib/store.ts`'s `localStorage`-backed `KeyValueStore`/`ReservationStore`
is retired — Supabase is the only backend now, not a fallback. Replaced
with:

- `lib/supabaseClient.ts` — creates the `@supabase/supabase-js` client
  from `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see
  Access Control below).
- A Supabase-backed reservation store and server-roster store, each
  exposing an **async** interface (`getAll(): Promise<...>`,
  `save(...): Promise<void>`, `clear(...): Promise<void>`) plus a
  `subscribe(onChange): unsubscribe` method wrapping a Supabase Realtime
  channel — this is the one real architectural shift, since today's store
  is synchronous.
- Pure, unit-testable mapping functions (`rowToReservation`,
  `reservationToRow`) convert between Postgres's row shape and the app's
  existing `Reservation` type (e.g. `table_number` ↔ `tableNumber`) — kept
  separate from the network code specifically so this logic stays testable
  the way the rest of `lib/` already is.

`lib/useReservations.ts` and `lib/useServerRoster.ts` are rewritten
in-place around the new async store: an initial fetch on mount (with a
loading state), a Realtime subscription for the component's lifetime that
merges in changes from other devices, and `saveReservation` / `seatTable`
/ `clearTable` / `setServerName` apply the change optimistically to local
state immediately (so the initiating device feels instant) while the
mutation is in flight — the Realtime echo naturally reconciles it. Their
returned shape (`reservationsByTable`, `getStatus`, `summary`,
`saveReservation`, etc.) stays the same, so `app/page.tsx`,
`app/staff/page.tsx`, and every component consuming these hooks needs no
changes beyond the new loading/connection states below.

## Access Control & the Anon Key

Supabase's client-side key (the "anon"/"publishable" key) is *designed* to
be public — the same way a Stripe publishable key or a Firebase client
config ships in browser code. Safety comes from the Row Level Security
policies above, not from hiding this key. It's still sourced from an env
var rather than hardcoded, per the project's existing convention:
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, added to
`.env.example` as placeholders and to `.env.local` (gitignored) with real
values locally. Because the GitHub Pages build is a static export, these
`NEXT_PUBLIC_*` values get baked in at *build* time, so they're also added
as GitHub Actions repository variables and passed into the build step in
`.github/workflows/deploy.yml`.

## Error Handling

- **Initial load fails** (Supabase unreachable): the floor plan is
  replaced with a clear error message and a retry button, rather than
  showing an empty or stale floor plan.
- **A mutation fails** (save/seat/clear): the optimistic local update is
  rolled back and an inline error is shown in the panel that triggered it.
- **The Realtime connection drops** (network blip, laptop sleep): the
  Supabase client auto-reconnects; the existing `!isPersistent` banner
  concept is repurposed into a `disconnected` indicator shown for as long
  as the Realtime channel is down, so staff know their view might be
  stale. It clears automatically on reconnect.

## Testing

`tests/tables.test.ts` and `tests/reservations.test.ts` (all pure
domain/display logic — status derivation, time math, validation) are
unaffected by this change. `tests/store.test.ts` and `tests/servers.test.ts`
test the retired `localStorage` persistence and are removed; new unit
tests cover `rowToReservation`/`reservationToRow` (the new pure logic this
change introduces). The network/Realtime code itself is verified manually
across multiple browser tabs/devices, consistent with how
`useReservations`/`useServerRoster` were already handled — the plan
[docs/superpowers/plans/2026-08-21-restaurant-table-reservations.md](../plans/2026-08-21-restaurant-table-reservations.md)
established this project never unit-tests hooks directly, only the pure
functions around them.

## Deployment Changes

- `package.json`: add `@supabase/supabase-js`.
- `.env.example`: add the two `NEXT_PUBLIC_SUPABASE_*` placeholders.
- `.github/workflows/deploy.yml`: pass the two env vars (sourced from
  GitHub repository variables) into the `npm run build` step.
- `supabase/schema.sql`: the table/policy/publication SQL above, committed
  to the repo so the schema is versioned and reproducible if the project
  is ever recreated.

## Future Improvements (explicitly deferred, not built now)

- Real access control (shared PIN or individual employee logins), since
  the database is now open to anyone with the URL, not just able to view
  the app's UI.
- Offline support: queue changes made while disconnected and reconcile on
  reconnect.
- Rate limiting / abuse protection on the open API.
- Multi-restaurant support (unchanged from the original spec's deferred
  list).
