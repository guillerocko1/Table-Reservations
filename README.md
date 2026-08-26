# Elena's Restaurant - West Portal — Table Reservations

A single-restaurant table reservation dashboard for front-of-house staff.
Color-coded floor plan — laid out to match the restaurant's actual
seating chart — where employees can add, seat, and clear reservations,
with a live counter of minutes seated on occupied tables. Reservation
and server-roster data is shared across every device in real time via
Supabase — a change made on one tablet appears on every other open
tablet or phone within about a second. Still no login: anyone with the
URL can view and edit, same as before.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000 for the full admin view (add/seat/clear),
or http://localhost:3000/staff for a read-only staff view — same live
floor plan, but clicking a table only shows its details, with no editing
controls anywhere on that page.

## Setup

Copy `.env.example` to `.env.local` and fill in your Supabase project's
values (Supabase dashboard → Project Settings → API → Project URL and
`anon` `public` key):

```bash
cp .env.example .env.local
```

Without this, `npm run dev` / `npm run build` fail fast with a clear error
naming the missing variable.

## Table layout

- Bar Lounge: 61–63 (rectangular tables, shown in their own column near the entry)
- Bar: 1–16 (individual numbered seats along the bar)
- High-Tops: 21–29 (individual numbered stools, three clusters of 3)
- Main Dining — Row 1: 31–37
- Main Dining — Row 2: 41–47
- Main Dining — Booths: 51–56 (curved booth seating; 56 is the large round booth)

## Checks

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run test        # unit tests for lib/tables.ts, lib/reservations.ts, lib/reservationRows.ts, lib/serverRows.ts
npm run build       # production build
```

## Deployment

Pushing to `main` builds the app as a static export (`next build` with
`output: "export"`) and publishes it to GitHub Pages via
`.github/workflows/deploy.yml`. The build step needs
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` available
as GitHub Actions **repository variables** (Settings → Secrets and
variables → Actions → Variables tab) — see `.env.example` for what they
are. The live URL is under the repo's **Settings → Pages** once the
first deploy finishes.

The one-time setup, after pushing this repo to GitHub: go to
**Settings → Pages → Source** and select **GitHub Actions**. After that,
every push to `main` deploys automatically — no manual steps.

To build the static export locally (e.g. to preview `out/` before pushing):

```bash
npm run build
npx serve out
```

## What's not built yet (see docs/superpowers/specs for the full design)

- Real employee accounts / login — the `/staff` page has no editing UI, but
  it isn't access-controlled; anyone with the URL can view it.
- Offline support — if a device can't reach Supabase it shows a clear
  disconnected/error state, but changes made while offline aren't queued.
- Multi-restaurant support.
