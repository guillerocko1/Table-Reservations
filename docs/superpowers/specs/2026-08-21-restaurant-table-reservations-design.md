# Restaurant Table Reservations — Design Spec

**Date:** 2026-08-21
**Status:** Approved for planning
**Author:** Claude Code (with Guillermo Ayala)

## Overview

A single-restaurant table reservation app for front-of-house employees. It
replaces a manual/paper system for tracking which tables are booked, seated,
or free, plus per-table guest details (party size, allergies, celebrations).
This is a **click-through demo**: no backend, no login, all data lives in the
browser (`localStorage`) so it survives refreshes on one machine and is easy
to try, tweak, and iterate on before any real backend/auth work is added.

## Goals

- Give an employee a single-screen, at-a-glance view of every table's status.
- Let an employee create, edit, seat, and clear a reservation for any table
  in a few clicks.
- Auto-flag tables that have run past their allotted time, so staff notice
  turnover issues without doing math.
- Ship something Guillermo can open in a browser today and give feedback on.

## Non-Goals (explicitly out of scope for this demo)

- Authentication / employee accounts.
- A real database or multi-device sync (two staff phones seeing the same
  live state) — noted as a fast-follow once the flow is validated.
- Multi-restaurant / multi-store support.
- Waitlists, online booking by customers, SMS/email confirmations, payments.
- Historical reporting/analytics on past reservations.

## Tech Stack

- Next.js (App Router) + React + TypeScript, matching Guillermo's stack
  preference and the conventions of his other local project.
- Tailwind CSS for styling.
- No database, no auth library, no external API calls — a purely
  client-side app so it needs zero setup beyond `npm install && npm run dev`.
- Project lives at `/Users/guillermohernandez/Desktop/Dev2/Restaurant Reservations`,
  a separate git repo from the unrelated "Lead Magnet" quiz app.

## Table Layout

Tables are defined as data, not hardcoded per-table markup, so relabeling or
adding tables later is a config change, not a code change.

```
Bar:            1–16
Main Dining A: 31–37
Main Dining B: 41–47
Main Dining C: 51–56
Main Dining D: 61–63
```

`lib/tables.ts` exports a `ZONES` array of `{ id, label, tableNumbers[] }`,
generated from numeric ranges. The floor plan renders one section per zone.

## Data Model

```ts
type Celebration = "None" | "Birthday" | "Anniversary" | "Engagement" | "Other";

interface Reservation {
  tableNumber: number;
  guestName: string;
  partySize: number;
  celebration: Celebration;
  allergies: string;        // free text, empty string = none noted
  reservationTime: string;  // the originally booked time slot (HH:mm)
  startTime: string | null; // when the party was actually seated (HH:mm), null until seated
  timeLimitMinutes: 30 | 60 | 90 | 120;
  finalTime: string | null; // derived: startTime + timeLimitMinutes, null until seated
}
```

`finalTime` is never entered by the user — it's computed the moment
`startTime` is set (or `timeLimitMinutes` changes) and displayed read-only.

## Status Lifecycle

Status is derived, not stored, from the reservation + current time:

| Status     | Condition                                              | Color  |
|------------|---------------------------------------------------------|--------|
| Available  | No reservation record for the table                    | Neutral/gray |
| Reserved   | Reservation exists, `startTime` is `null`               | Blue   |
| Occupied   | `startTime` set, now ≤ `finalTime`                      | Amber  |
| Overdue    | `startTime` set, now > `finalTime`                      | Red    |

Transitions are manual, matching the real workflow:
- **Add Reservation** → creates a `Reserved` record.
- **Seat Now** → sets `startTime` to the current time (or an employee-entered
  time), computing `finalTime`; table becomes `Occupied`.
- **Clear Table** → deletes the reservation record entirely; table returns to
  `Available`, ready for a new booking. Nothing auto-clears — an overdue
  table stays visibly red until staff act on it.

A lightweight polling timer (e.g. every 30s) re-renders the floor plan so
`Occupied` tables flip to `Overdue` live without a manual refresh.

## UI / Components

- `app/page.tsx` — dashboard page (client component; needs local state/localStorage).
- `components/StatusSummary.tsx` — top strip with live counts: Available /
  Reserved / Occupied / Overdue.
- `components/FloorPlan.tsx` — renders each zone as a labeled section of
  `TableCard`s.
- `components/TableCard.tsx` — table number, color-coded by status, guest
  name + party size when occupied/reserved, click opens the detail panel.
- `components/ReservationPanel.tsx` — slide-over/modal form: all reservation
  fields, computed Final Time (read-only), and action buttons (Save, Seat
  Now, Clear Table, Cancel).
- `lib/tables.ts` — zone/table-number config.
- `lib/reservations.ts` — `Reservation` type, status derivation function,
  final-time calculation, localStorage read/write helpers.
- `lib/useReservations.ts` — React hook wrapping localStorage state, CRUD
  actions, and the polling timer.

Visual design pass (colors, spacing, type) follows the frontend-design skill
so the result reads as intentional rather than default Bootstrap-y.

## Error Handling

- `localStorage` unavailable (e.g. private browsing) → fall back to
  in-memory state for the session, with a small dismissible warning banner
  ("Changes won't be saved after you close this tab").
- Form validation: guest name and party size are required; party size must
  be a positive integer; time limit must be one of the fixed options (no
  free-typed zero/negative values).
- Clearing a table and seating a table both require confirmation only in
  the sense of being explicit buttons (no accidental single-click deletes
  from the floor plan view itself — only from inside the detail panel).

## Testing

Matching the pattern used in Guillermo's other local project:
- Unit tests (Node's built-in test runner, `--experimental-strip-types`)
  for the pure logic in `lib/reservations.ts`: status derivation across all
  four states, and final-time calculation across each time-limit option.
- `tsc --noEmit` for type checking.
- `eslint` for linting.
- No end-to-end/browser tests for this demo stage — manual click-through in
  the browser is the acceptance test.

## Future Improvements (explicitly deferred, not built now)

- Swap `localStorage` for a real database (e.g. Supabase/Postgres) so state
  is shared across devices (host stand + servers' phones).
- Employee accounts/login.
- Multi-restaurant/store support (relevant given Guillermo manages several
  stores).
- Deploy to Vercel for anywhere-access instead of local-only `next dev`.
