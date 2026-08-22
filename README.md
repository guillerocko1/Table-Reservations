# Restaurant Table Reservations

A single-restaurant table reservation dashboard for front-of-house staff.
Color-coded floor plan (Bar + 4 Main Dining zones) where employees can add,
seat, and clear reservations, with a live counter of minutes seated on
occupied tables. This is a click-through demo: no backend, no login — all
data is saved to your browser's `localStorage`.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000 for the full admin view (add/seat/clear),
or http://localhost:3000/staff for a read-only staff view — same live
floor plan, but clicking a table only shows its details, with no editing
controls anywhere on that page.

## Table layout

- Bar: 1–16
- Main Dining A: 31–37
- Main Dining B: 41–47
- Main Dining C: 51–56
- Main Dining D: 61–63

## Checks

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run test        # unit tests for lib/tables.ts, lib/reservations.ts (incl. minutesSince), lib/store.ts
npm run build       # production build
```

## What's not built yet (see docs/superpowers/specs for the full design)

- Real database / multi-device sync — right now state is per-browser only.
- Real employee accounts / login — the `/staff` page has no editing UI, but
  it isn't access-controlled; anyone with the URL can view it.
- Multi-restaurant support.
- Deployment (currently local-only via `next dev`).
