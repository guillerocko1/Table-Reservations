# Restaurant Table Reservations

A single-restaurant table reservation dashboard for front-of-house staff.
Color-coded floor plan (Bar + 4 Main Dining zones) where employees can add,
seat, and clear reservations. This is a click-through demo: no backend, no
login — all data is saved to your browser's `localStorage`.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

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
npm run test        # unit tests for lib/tables.ts, lib/reservations.ts, lib/store.ts
npm run build       # production build
```

## What's not built yet (see docs/superpowers/specs for the full design)

- Real database / multi-device sync — right now state is per-browser only.
- Employee accounts / login.
- Multi-restaurant support.
- Deployment (currently local-only via `next dev`).
