# Restaurant Table Reservations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a click-through demo of a single-restaurant table reservation dashboard — a color-coded floor plan (Bar + 4 Main Dining zones) where employees can add, seat, and clear reservations, with all data persisted to `localStorage`.

**Architecture:** A Next.js (App Router) + React + TypeScript app with zero backend. Pure domain logic (table layout, status derivation, time math, validation) lives in small, independently-tested `lib/` modules with no framework dependencies. A single `useReservations` hook wires that logic to `localStorage` (with an in-memory fallback) and exposes everything the UI needs. Three presentational components (`StatusSummary`, `FloorPlan`/`TableCard`, `ReservationPanel`) compose into one dashboard page.

**Tech Stack:** Next.js 16.3.0, React 19.2.8, TypeScript 6.0.3, Tailwind CSS 4.3.3, ESLint 10.8.1 (flat config via `typescript-eslint`), Node's built-in test runner (`node --experimental-strip-types --test`). No database, no auth, no external packages beyond these.

**Spec:** `docs/superpowers/specs/2026-08-21-restaurant-table-reservations-design.md`

## Global Constraints

- No backend, no database, no authentication — all state lives in `localStorage` with an in-memory fallback (spec: Tech Stack, Non-Goals).
- Table zones are exactly: Bar 1–16, Main Dining A 31–37, Main Dining B 41–47, Main Dining C 51–56, Main Dining D 61–63 (spec: Table Layout).
- `finalTime` is always derived (`startTime + timeLimitMinutes`), never entered directly by the user (spec: Data Model).
- Status is derived, never stored: Available (no record) → Reserved (record, no `startTime`) → Occupied (`now ≤ finalTime`) → Overdue (`now > finalTime`); transitions are manual via Add/Seat Now/Clear Table, nothing auto-clears (spec: Status Lifecycle).
- Time limit is restricted to 30/60/90/120 minutes; guest name and party size (positive integer) are required (spec: Error Handling).
- Automated tests cover only pure logic in `lib/` (Node test runner); UI is verified manually in the browser; `tsc --noEmit` and `eslint` must both pass (spec: Testing).
- ES modules, `async`/`await` over `.then()`, 2-space indentation, descriptive names, comments explain *why* not *what* (Guillermo's global coding style).
- No new dependencies beyond what's listed in the Tech Stack above without checking in first.
- Project root: `/Users/guillermohernandez/Desktop/Dev2/Restaurant Reservations` (separate git repo from the unrelated "Lead Magnet" project).

---

### Task 1: Project scaffolding & running skeleton

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `.gitignore`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `app/page.tsx`

**Interfaces:**
- Produces: CSS custom properties on `:root` (`--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-accent-hover`, and per-status `--color-{available,reserved,occupied,overdue}-{bg,border,text}`) that every later component references via Tailwind arbitrary values, e.g. `bg-[var(--color-available-bg)]`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "restaurant-reservations",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Table reservation dashboard for bar and main dining sections.",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "node --experimental-strip-types --test tests/**/*.test.ts",
    "pre-commit": "npm run lint && npm run typecheck && npm run test"
  },
  "dependencies": {
    "next": "16.3.0",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "typescript": "6.0.3",
    "@types/node": "26.2.0",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.4",
    "tailwindcss": "4.3.3",
    "@tailwindcss/postcss": "4.3.3",
    "eslint": "10.8.1",
    "@eslint/js": "10.0.1",
    "typescript-eslint": "8.67.0"
  }
}
```

These are the exact versions already proven to install and build cleanly on this machine (same as the sibling `Lead Magnet` project).

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

- [ ] **Step 4: Create `postcss.config.mjs`**

```js
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 5: Create `eslint.config.mjs`**

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Plain typescript-eslint flat config — see the sibling Lead Magnet project
// for why eslint-config-next's FlatCompat shim is skipped at these versions.
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["node_modules/**", ".next/**"],
  },
);
```

- [ ] **Step 6: Create `.gitignore`**

```
# Environment variables
.env
.env.local
.env.*.local

# Dependencies
node_modules/

# Build outputs
.next/
out/

# IDE & Editor
.vscode/
.idea/
.DS_Store

# Logs
*.log
npm-debug.log*

# TypeScript build info
*.tsbuildinfo
```

- [ ] **Step 7: Run `npm install`**

Run: `npm install`
Expected: installs without errors, creates `package-lock.json` and `node_modules/`.

- [ ] **Step 8: Skim the installed Next.js docs before writing app code**

Run: `ls node_modules/next/dist/docs/`

Open and skim whichever file(s) cover App Router basics (layout, page, `next.config`, metadata). This project's Next.js version may differ from training data on conventions — confirm the `layout.tsx`/`page.tsx`/`next.config.mjs` shapes below still match before proceeding. If something's changed, adjust the code in this task (and flag it) rather than silently using outdated conventions.

- [ ] **Step 9: Create `app/globals.css`**

```css
@import "tailwindcss";

/* Design tokens for the reservation app. Change values here (not
   per-component) to re-theme the whole app. */
:root {
  --color-bg: #faf7f2;
  --color-surface: #ffffff;
  --color-border: #e4ded3;
  --color-text: #241c14;
  --color-text-muted: #7a6f60;
  --color-accent: #b5502f;
  --color-accent-hover: #963f23;

  --color-available-bg: #eef1ec;
  --color-available-border: #b7c4b3;
  --color-available-text: #3d4a3a;

  --color-reserved-bg: #e7eef7;
  --color-reserved-border: #7fa3d1;
  --color-reserved-text: #1f3a5f;

  --color-occupied-bg: #fbf1dc;
  --color-occupied-border: #dca43c;
  --color-occupied-text: #6b4a12;

  --color-overdue-bg: #fbeae7;
  --color-overdue-border: #dd6355;
  --color-overdue-text: #7a2018;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
}
```

- [ ] **Step 10: Create `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Table Reservations",
  description: "Manage bar and main dining table reservations.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 11: Create a placeholder `app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">
        Table Reservations
      </h1>
      <p className="text-sm text-[var(--color-text-muted)]">Setup in progress.</p>
    </main>
  );
}
```

- [ ] **Step 12: Verify the app builds**

Run: `npm run build`
Expected: build completes successfully with no type or lint errors.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app skeleton"
```

---

### Task 2: Table zone configuration

**Files:**
- Create: `lib/tables.ts`
- Test: `tests/tables.test.ts`

**Interfaces:**
- Produces: `interface Zone { id: string; label: string; tableNumbers: number[] }`, `export const ZONES: Zone[]`, `export const ALL_TABLE_NUMBERS: number[]` — consumed by `lib/reservations.ts` (Task 3), `lib/useReservations.ts` (Task 7), and `components/FloorPlan.tsx` (Task 6).

- [ ] **Step 1: Write the failing tests**

Create `tests/tables.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { ZONES, ALL_TABLE_NUMBERS } from "../lib/tables.ts";

test("bar zone covers tables 1 to 16", () => {
  const bar = ZONES.find((zone) => zone.id === "bar");
  assert.ok(bar);
  assert.deepEqual(bar.tableNumbers, Array.from({ length: 16 }, (_, i) => i + 1));
});

test("main dining zones cover the documented ranges", () => {
  const expected: Record<string, number[]> = {
    "main-a": [31, 32, 33, 34, 35, 36, 37],
    "main-b": [41, 42, 43, 44, 45, 46, 47],
    "main-c": [51, 52, 53, 54, 55, 56],
    "main-d": [61, 62, 63],
  };
  for (const [id, numbers] of Object.entries(expected)) {
    const zone = ZONES.find((z) => z.id === id);
    assert.ok(zone, `missing zone ${id}`);
    assert.deepEqual(zone.tableNumbers, numbers);
  }
});

test("all table numbers are unique across zones and total 39", () => {
  assert.equal(ALL_TABLE_NUMBERS.length, 39);
  assert.equal(new Set(ALL_TABLE_NUMBERS).size, ALL_TABLE_NUMBERS.length);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --experimental-strip-types --test tests/tables.test.ts`
Expected: FAIL — `lib/tables.ts` does not exist yet.

- [ ] **Step 3: Implement `lib/tables.ts`**

```ts
export interface Zone {
  id: string;
  label: string;
  tableNumbers: number[];
}

function range(start: number, end: number): number[] {
  const numbers: number[] = [];
  for (let n = start; n <= end; n++) numbers.push(n);
  return numbers;
}

export const ZONES: Zone[] = [
  { id: "bar", label: "Bar", tableNumbers: range(1, 16) },
  { id: "main-a", label: "Main Dining A", tableNumbers: range(31, 37) },
  { id: "main-b", label: "Main Dining B", tableNumbers: range(41, 47) },
  { id: "main-c", label: "Main Dining C", tableNumbers: range(51, 56) },
  { id: "main-d", label: "Main Dining D", tableNumbers: range(61, 63) },
];

export const ALL_TABLE_NUMBERS: number[] = ZONES.flatMap((zone) => zone.tableNumbers);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --experimental-strip-types --test tests/tables.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tables.ts tests/tables.test.ts
git commit -m "Add table zone configuration"
```

---

### Task 3: Reservation domain logic

**Files:**
- Create: `lib/reservations.ts`
- Test: `tests/reservations.test.ts`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces:
  - `type Celebration = "None" | "Birthday" | "Anniversary" | "Engagement" | "Other"`
  - `type TimeLimitMinutes = 30 | 60 | 90 | 120`
  - `type ReservationStatus = "available" | "reserved" | "occupied" | "overdue"`
  - `interface Reservation { tableNumber: number; guestName: string; partySize: number; celebration: Celebration; allergies: string; reservationTime: string; startTime: string | null; timeLimitMinutes: TimeLimitMinutes; finalTime: string | null }`
  - `interface ReservationInput { guestName: string; partySize: number; celebration: Celebration; allergies: string; reservationTime: string; timeLimitMinutes: TimeLimitMinutes }`
  - `interface StatusSummary { available: number; reserved: number; occupied: number; overdue: number }`
  - `function computeFinalTime(startTime: string, timeLimitMinutes: TimeLimitMinutes): string`
  - `function statusFor(reservation: Reservation | undefined, now: Date): ReservationStatus`
  - `function validateReservationInput(input: ReservationInput): { valid: boolean; errors: Partial<Record<keyof ReservationInput, string>> }`
  - `function summarizeStatuses(reservationsByTable: Record<number, Reservation>, allTableNumbers: number[], now: Date): StatusSummary`
  - These are consumed by `lib/store.ts` (Task 4, the `Reservation` type), `lib/useReservations.ts` (Task 7), and `components/ReservationPanel.tsx` (Task 8).
- Known limitation (documented, not a bug): times are plain `HH:mm` strings compared within a single day. A reservation whose window crosses midnight (e.g. start `23:30` + 90 min) is out of scope for this demo — see spec's Future Improvements.

- [ ] **Step 1: Write the failing tests**

Create `tests/reservations.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFinalTime,
  statusFor,
  validateReservationInput,
  summarizeStatuses,
  type Reservation,
} from "../lib/reservations.ts";

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    tableNumber: 1,
    guestName: "Alex Rivera",
    partySize: 2,
    celebration: "None",
    allergies: "",
    reservationTime: "18:00",
    startTime: null,
    timeLimitMinutes: 90,
    finalTime: null,
    ...overrides,
  };
}

test("computeFinalTime adds the time limit to the start time", () => {
  assert.equal(computeFinalTime("18:00", 30), "18:30");
  assert.equal(computeFinalTime("18:00", 60), "19:00");
  assert.equal(computeFinalTime("18:30", 90), "20:00");
  assert.equal(computeFinalTime("21:15", 120), "23:15");
});

test("statusFor: no reservation is available", () => {
  assert.equal(statusFor(undefined, new Date()), "available");
});

test("statusFor: reservation without a start time is reserved", () => {
  const reservation = makeReservation();
  assert.equal(statusFor(reservation, new Date()), "reserved");
});

test("statusFor: seated and within the time limit is occupied", () => {
  const now = new Date();
  now.setHours(19, 0, 0, 0);
  const reservation = makeReservation({ startTime: "18:00", finalTime: "20:00" });
  assert.equal(statusFor(reservation, now), "occupied");
});

test("statusFor: seated and past the final time is overdue", () => {
  const now = new Date();
  now.setHours(20, 30, 0, 0);
  const reservation = makeReservation({ startTime: "18:00", finalTime: "20:00" });
  assert.equal(statusFor(reservation, now), "overdue");
});

test("validateReservationInput: valid input has no errors", () => {
  const result = validateReservationInput({
    guestName: "Alex Rivera",
    partySize: 4,
    celebration: "Birthday",
    allergies: "peanuts",
    reservationTime: "18:00",
    timeLimitMinutes: 90,
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test("validateReservationInput: rejects missing guest name", () => {
  const result = validateReservationInput({
    guestName: "   ",
    partySize: 2,
    celebration: "None",
    allergies: "",
    reservationTime: "18:00",
    timeLimitMinutes: 60,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.guestName);
});

test("validateReservationInput: rejects zero or fractional party size", () => {
  const zero = validateReservationInput({
    guestName: "Alex",
    partySize: 0,
    celebration: "None",
    allergies: "",
    reservationTime: "18:00",
    timeLimitMinutes: 60,
  });
  assert.equal(zero.valid, false);

  const fractional = validateReservationInput({
    guestName: "Alex",
    partySize: 2.5,
    celebration: "None",
    allergies: "",
    reservationTime: "18:00",
    timeLimitMinutes: 60,
  });
  assert.equal(fractional.valid, false);
});

test("summarizeStatuses counts every table into exactly one bucket", () => {
  const now = new Date();
  now.setHours(19, 0, 0, 0);
  const reservationsByTable: Record<number, Reservation> = {
    1: makeReservation({ tableNumber: 1 }), // reserved
    2: makeReservation({ tableNumber: 2, startTime: "18:00", finalTime: "20:00" }), // occupied
    3: makeReservation({ tableNumber: 3, startTime: "16:00", finalTime: "17:30" }), // overdue
  };
  const summary = summarizeStatuses(reservationsByTable, [1, 2, 3, 4], now);
  assert.deepEqual(summary, { available: 1, reserved: 1, occupied: 1, overdue: 1 });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --experimental-strip-types --test tests/reservations.test.ts`
Expected: FAIL — `lib/reservations.ts` does not exist yet.

- [ ] **Step 3: Implement `lib/reservations.ts`**

```ts
export type Celebration = "None" | "Birthday" | "Anniversary" | "Engagement" | "Other";
export type TimeLimitMinutes = 30 | 60 | 90 | 120;
export type ReservationStatus = "available" | "reserved" | "occupied" | "overdue";

export interface Reservation {
  tableNumber: number;
  guestName: string;
  partySize: number;
  celebration: Celebration;
  allergies: string;
  reservationTime: string;
  startTime: string | null;
  timeLimitMinutes: TimeLimitMinutes;
  finalTime: string | null;
}

export interface ReservationInput {
  guestName: string;
  partySize: number;
  celebration: Celebration;
  allergies: string;
  reservationTime: string;
  timeLimitMinutes: TimeLimitMinutes;
}

export interface StatusSummary {
  available: number;
  reserved: number;
  occupied: number;
  overdue: number;
}

const VALID_TIME_LIMITS: TimeLimitMinutes[] = [30, 60, 90, 120];

// Times are plain "HH:mm" strings within a single day — a reservation whose
// window crosses midnight is out of scope for this demo (see spec).
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function computeFinalTime(startTime: string, timeLimitMinutes: TimeLimitMinutes): string {
  return minutesToTime(timeToMinutes(startTime) + timeLimitMinutes);
}

export function statusFor(reservation: Reservation | undefined, now: Date): ReservationStatus {
  if (!reservation) return "available";
  if (!reservation.startTime || !reservation.finalTime) return "reserved";
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const finalMinutes = timeToMinutes(reservation.finalTime);
  return nowMinutes > finalMinutes ? "overdue" : "occupied";
}

export function validateReservationInput(
  input: ReservationInput,
): { valid: boolean; errors: Partial<Record<keyof ReservationInput, string>> } {
  const errors: Partial<Record<keyof ReservationInput, string>> = {};

  if (!input.guestName.trim()) {
    errors.guestName = "Guest name is required.";
  }
  if (!Number.isInteger(input.partySize) || input.partySize < 1) {
    errors.partySize = "Party size must be a whole number of at least 1.";
  }
  if (!VALID_TIME_LIMITS.includes(input.timeLimitMinutes)) {
    errors.timeLimitMinutes = "Time limit must be 30, 60, 90, or 120 minutes.";
  }
  if (!input.reservationTime) {
    errors.reservationTime = "Reservation time is required.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function summarizeStatuses(
  reservationsByTable: Record<number, Reservation>,
  allTableNumbers: number[],
  now: Date,
): StatusSummary {
  const summary: StatusSummary = { available: 0, reserved: 0, occupied: 0, overdue: 0 };
  for (const tableNumber of allTableNumbers) {
    const status = statusFor(reservationsByTable[tableNumber], now);
    summary[status] += 1;
  }
  return summary;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --experimental-strip-types --test tests/reservations.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/reservations.ts tests/reservations.test.ts
git commit -m "Add reservation domain logic (status, time math, validation)"
```

---

### Task 4: Persistence layer (localStorage with in-memory fallback)

**Files:**
- Create: `lib/store.ts`
- Test: `tests/store.test.ts`

**Interfaces:**
- Consumes: `Reservation` type from `lib/reservations.ts` (Task 3).
- Produces:
  - `interface KeyValueStore { getItem(key: string): string | null; setItem(key: string, value: string): void }`
  - `function createMemoryStore(): KeyValueStore`
  - `function isStoreAvailable(store: KeyValueStore): boolean`
  - `interface ReservationStore { getAll(): Record<number, Reservation>; save(reservation: Reservation): void; clear(tableNumber: number): void }`
  - `function createReservationStore(store: KeyValueStore): ReservationStore`
  - These are consumed by `lib/useReservations.ts` (Task 7), which passes `window.localStorage` (implements `KeyValueStore` already) or `createMemoryStore()` as the fallback.

- [ ] **Step 1: Write the failing tests**

Create `tests/store.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createMemoryStore,
  createReservationStore,
  isStoreAvailable,
  type KeyValueStore,
} from "../lib/store.ts";
import type { Reservation } from "../lib/reservations.ts";

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    tableNumber: 1,
    guestName: "Alex Rivera",
    partySize: 2,
    celebration: "None",
    allergies: "",
    reservationTime: "18:00",
    startTime: null,
    timeLimitMinutes: 90,
    finalTime: null,
    ...overrides,
  };
}

test("createReservationStore: save then getAll round-trips a reservation", () => {
  const store = createReservationStore(createMemoryStore());
  store.save(makeReservation({ tableNumber: 5, guestName: "Jordan" }));
  const all = store.getAll();
  assert.equal(all[5].guestName, "Jordan");
});

test("createReservationStore: clear removes only the given table", () => {
  const store = createReservationStore(createMemoryStore());
  store.save(makeReservation({ tableNumber: 5 }));
  store.save(makeReservation({ tableNumber: 6 }));
  store.clear(5);
  const all = store.getAll();
  assert.equal(all[5], undefined);
  assert.ok(all[6]);
});

test("createReservationStore: getAll on an empty store returns an empty object", () => {
  const store = createReservationStore(createMemoryStore());
  assert.deepEqual(store.getAll(), {});
});

test("isStoreAvailable: true for a working store", () => {
  assert.equal(isStoreAvailable(createMemoryStore()), true);
});

test("isStoreAvailable: false for a store that throws (e.g. private browsing)", () => {
  const throwingStore: KeyValueStore = {
    getItem: () => null,
    setItem: () => {
      throw new Error("quota exceeded");
    },
  };
  assert.equal(isStoreAvailable(throwingStore), false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --experimental-strip-types --test tests/store.test.ts`
Expected: FAIL — `lib/store.ts` does not exist yet.

- [ ] **Step 3: Implement `lib/store.ts`**

```ts
import type { Reservation } from "./reservations.ts";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "restaurant-reservations:v1";
const PROBE_KEY = "restaurant-reservations:probe";

export function createMemoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

// Feature-detects a usable store — covers private browsing modes where
// localStorage exists but setItem throws (e.g. Safari's quota-exceeded).
export function isStoreAvailable(store: KeyValueStore): boolean {
  try {
    store.setItem(PROBE_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

export interface ReservationStore {
  getAll(): Record<number, Reservation>;
  save(reservation: Reservation): void;
  clear(tableNumber: number): void;
}

export function createReservationStore(store: KeyValueStore): ReservationStore {
  function readAll(): Record<number, Reservation> {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<number, Reservation>;
    } catch {
      return {};
    }
  }

  function writeAll(all: Record<number, Reservation>): void {
    store.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  return {
    getAll: readAll,
    save(reservation) {
      const all = readAll();
      all[reservation.tableNumber] = reservation;
      writeAll(all);
    },
    clear(tableNumber) {
      const all = readAll();
      delete all[tableNumber];
      writeAll(all);
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --experimental-strip-types --test tests/store.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/store.ts tests/store.test.ts
git commit -m "Add localStorage persistence layer with in-memory fallback"
```

---

### Task 5: Status summary bar, wired into the page

**Files:**
- Create: `components/StatusSummary.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `StatusSummary` type from `lib/reservations.ts` (Task 3).
- Produces: `<StatusSummary summary={StatusSummary} />` — consumed by `app/page.tsx` now and unchanged through later tasks.

- [ ] **Step 1: Create `components/StatusSummary.tsx`**

```tsx
import type { StatusSummary as StatusSummaryData } from "@/lib/reservations";

interface StatusSummaryProps {
  summary: StatusSummaryData;
}

const ITEMS: { key: keyof StatusSummaryData; label: string; dotClass: string }[] = [
  { key: "available", label: "Available", dotClass: "bg-[var(--color-available-border)]" },
  { key: "reserved", label: "Reserved", dotClass: "bg-[var(--color-reserved-border)]" },
  { key: "occupied", label: "Occupied", dotClass: "bg-[var(--color-occupied-border)]" },
  { key: "overdue", label: "Overdue", dotClass: "bg-[var(--color-overdue-border)]" },
];

export function StatusSummary({ summary }: StatusSummaryProps) {
  return (
    <div className="flex flex-wrap gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
      {ITEMS.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${item.dotClass}`} />
          <span className="text-sm text-[var(--color-text-muted)]">{item.label}</span>
          <span className="text-lg font-semibold text-[var(--color-text)]">{summary[item.key]}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `app/page.tsx` with sample data**

Replace the contents of `app/page.tsx`:

```tsx
import { StatusSummary } from "@/components/StatusSummary";

export default function Home() {
  const sampleSummary = { available: 39, reserved: 0, occupied: 0, overdue: 0 };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">Table Reservations</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Bar and main dining floor plan</p>
      </header>
      <StatusSummary summary={sampleSummary} />
    </main>
  );
}
```

- [ ] **Step 3: Verify the app builds**

Run: `npm run build`
Expected: build completes successfully.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: a row of four labeled counts (Available 39, Reserved 0, Occupied 0, Overdue 0), each with a colored dot matching its status color from `globals.css`.

- [ ] **Step 5: Commit**

```bash
git add components/StatusSummary.tsx app/page.tsx
git commit -m "Add status summary bar"
```

---

### Task 6: Floor plan and table cards, wired into the page

**Files:**
- Create: `components/TableCard.tsx`
- Create: `components/FloorPlan.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `ZONES` from `lib/tables.ts` (Task 2); `Reservation`, `ReservationStatus` from `lib/reservations.ts` (Task 3).
- Produces:
  - `<TableCard tableNumber={number} status={ReservationStatus} reservation={Reservation | undefined} onSelect={(tableNumber: number) => void} />`
  - `<FloorPlan reservationsByTable={Record<number, Reservation>} getStatus={(tableNumber: number) => ReservationStatus} onSelectTable={(tableNumber: number) => void} />`
  - Both consumed by `app/page.tsx` now, and unchanged through later tasks.

- [ ] **Step 1: Create `components/TableCard.tsx`**

```tsx
import type { Reservation, ReservationStatus } from "@/lib/reservations";

interface TableCardProps {
  tableNumber: number;
  status: ReservationStatus;
  reservation: Reservation | undefined;
  onSelect: (tableNumber: number) => void;
}

const STATUS_STYLES: Record<ReservationStatus, string> = {
  available:
    "bg-[var(--color-available-bg)] border-[var(--color-available-border)] text-[var(--color-available-text)]",
  reserved:
    "bg-[var(--color-reserved-bg)] border-[var(--color-reserved-border)] text-[var(--color-reserved-text)]",
  occupied:
    "bg-[var(--color-occupied-bg)] border-[var(--color-occupied-border)] text-[var(--color-occupied-text)]",
  overdue:
    "bg-[var(--color-overdue-bg)] border-[var(--color-overdue-border)] text-[var(--color-overdue-text)]",
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  overdue: "Overdue",
};

export function TableCard({ tableNumber, status, reservation, onSelect }: TableCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tableNumber)}
      className={`flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 p-2 text-center transition hover:brightness-95 ${STATUS_STYLES[status]}`}
    >
      <span className="font-serif text-xl font-bold">{tableNumber}</span>
      <span className="text-[11px] font-medium uppercase tracking-wide">{STATUS_LABELS[status]}</span>
      {reservation && (
        <span className="truncate text-xs">
          {reservation.guestName} · {reservation.partySize}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Create `components/FloorPlan.tsx`**

```tsx
import { ZONES } from "@/lib/tables";
import type { Reservation, ReservationStatus } from "@/lib/reservations";
import { TableCard } from "./TableCard";

interface FloorPlanProps {
  reservationsByTable: Record<number, Reservation>;
  getStatus: (tableNumber: number) => ReservationStatus;
  onSelectTable: (tableNumber: number) => void;
}

export function FloorPlan({ reservationsByTable, getStatus, onSelectTable }: FloorPlanProps) {
  return (
    <div className="flex flex-col gap-8">
      {ZONES.map((zone) => (
        <section key={zone.id}>
          <h2 className="mb-3 font-serif text-lg font-semibold text-[var(--color-text)]">
            {zone.label}
          </h2>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
            {zone.tableNumbers.map((tableNumber) => (
              <TableCard
                key={tableNumber}
                tableNumber={tableNumber}
                status={getStatus(tableNumber)}
                reservation={reservationsByTable[tableNumber]}
                onSelect={onSelectTable}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire it into `app/page.tsx`**

Replace the contents of `app/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { StatusSummary } from "@/components/StatusSummary";
import { FloorPlan } from "@/components/FloorPlan";
import { ALL_TABLE_NUMBERS } from "@/lib/tables";
import { summarizeStatuses, type Reservation, type ReservationStatus } from "@/lib/reservations";

export default function Home() {
  const [reservationsByTable] = useState<Record<number, Reservation>>({});
  const now = new Date();

  function getStatus(tableNumber: number): ReservationStatus {
    return reservationsByTable[tableNumber] ? "reserved" : "available";
  }

  const summary = summarizeStatuses(reservationsByTable, ALL_TABLE_NUMBERS, now);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">Table Reservations</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Bar and main dining floor plan</p>
      </header>
      <StatusSummary summary={summary} />
      <FloorPlan
        reservationsByTable={reservationsByTable}
        getStatus={getStatus}
        onSelectTable={() => {}}
      />
    </main>
  );
}
```

(This task's `getStatus`/`onSelectTable` are placeholders replaced by the real hook in Task 7 — the goal here is only to confirm the floor plan renders correctly.)

- [ ] **Step 4: Verify the app builds**

Run: `npm run build`
Expected: build completes successfully.

- [ ] **Step 5: Manually verify in the browser**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: five labeled zone sections (Bar, Main Dining A–D) containing 16, 7, 7, 6, and 3 gray "Available" table cards respectively — 39 total, numbered correctly.

- [ ] **Step 6: Commit**

```bash
git add components/TableCard.tsx components/FloorPlan.tsx app/page.tsx
git commit -m "Add floor plan and table card components"
```

---

### Task 7: Live state via the `useReservations` hook

**Files:**
- Create: `lib/useReservations.ts`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `ALL_TABLE_NUMBERS` from `lib/tables.ts` (Task 2); `Reservation`, `ReservationInput`, `ReservationStatus`, `StatusSummary`, `computeFinalTime`, `statusFor`, `summarizeStatuses` from `lib/reservations.ts` (Task 3); `createMemoryStore`, `createReservationStore`, `isStoreAvailable`, `ReservationStore` from `lib/store.ts` (Task 4).
- Produces: `function useReservations(): { reservationsByTable: Record<number, Reservation>; now: Date; isPersistent: boolean; getStatus: (tableNumber: number) => ReservationStatus; summary: StatusSummary; saveReservation: (tableNumber: number, input: ReservationInput) => void; seatTable: (tableNumber: number, startTime: string) => void; clearTable: (tableNumber: number) => void }` — consumed by `app/page.tsx` now and by `components/ReservationPanel.tsx` via `app/page.tsx` in Task 8.

No automated tests for this task — it's a thin React/browser wrapper around the already-tested logic in Tasks 3–4; verification is manual in the browser (consistent with the spec's Testing section).

- [ ] **Step 1: Create `lib/useReservations.ts`**

```ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeFinalTime,
  statusFor,
  summarizeStatuses,
  type Reservation,
  type ReservationInput,
  type ReservationStatus,
  type StatusSummary,
} from "./reservations";
import { ALL_TABLE_NUMBERS } from "./tables";
import { createMemoryStore, createReservationStore, isStoreAvailable, type ReservationStore } from "./store";

const POLL_INTERVAL_MS = 30_000;

export interface UseReservationsResult {
  reservationsByTable: Record<number, Reservation>;
  now: Date;
  isPersistent: boolean;
  getStatus: (tableNumber: number) => ReservationStatus;
  summary: StatusSummary;
  saveReservation: (tableNumber: number, input: ReservationInput) => void;
  seatTable: (tableNumber: number, startTime: string) => void;
  clearTable: (tableNumber: number) => void;
}

function getBrowserStore(): { store: ReservationStore; isPersistent: boolean } {
  if (typeof window !== "undefined" && isStoreAvailable(window.localStorage)) {
    return { store: createReservationStore(window.localStorage), isPersistent: true };
  }
  return { store: createReservationStore(createMemoryStore()), isPersistent: false };
}

export function useReservations(): UseReservationsResult {
  const [{ store, isPersistent }] = useState(getBrowserStore);
  const [reservationsByTable, setReservationsByTable] = useState<Record<number, Reservation>>({});
  const [now, setNow] = useState(new Date());

  // Load whatever was already saved once the component mounts on the
  // client (server-rendered output always starts empty, so this can't
  // cause a hydration mismatch).
  useEffect(() => {
    setReservationsByTable(store.getAll());
  }, [store]);

  // Re-derive statuses periodically so an Occupied table flips to Overdue
  // live, without the employee needing to refresh the page.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const saveReservation = useCallback(
    (tableNumber: number, input: ReservationInput) => {
      setReservationsByTable((current) => {
        const existing = current[tableNumber];
        const reservation: Reservation = {
          tableNumber,
          guestName: input.guestName,
          partySize: input.partySize,
          celebration: input.celebration,
          allergies: input.allergies,
          reservationTime: input.reservationTime,
          timeLimitMinutes: input.timeLimitMinutes,
          startTime: existing?.startTime ?? null,
          finalTime: existing?.finalTime ?? null,
        };
        store.save(reservation);
        return { ...current, [tableNumber]: reservation };
      });
    },
    [store],
  );

  const seatTable = useCallback(
    (tableNumber: number, startTime: string) => {
      setReservationsByTable((current) => {
        const existing = current[tableNumber];
        if (!existing) return current;
        const updated: Reservation = {
          ...existing,
          startTime,
          finalTime: computeFinalTime(startTime, existing.timeLimitMinutes),
        };
        store.save(updated);
        return { ...current, [tableNumber]: updated };
      });
    },
    [store],
  );

  const clearTable = useCallback(
    (tableNumber: number) => {
      setReservationsByTable((current) => {
        const next = { ...current };
        delete next[tableNumber];
        store.clear(tableNumber);
        return next;
      });
    },
    [store],
  );

  const summary = useMemo(
    () => summarizeStatuses(reservationsByTable, ALL_TABLE_NUMBERS, now),
    [reservationsByTable, now],
  );

  return {
    reservationsByTable,
    now,
    isPersistent,
    getStatus: (tableNumber: number) => statusFor(reservationsByTable[tableNumber], now),
    summary,
    saveReservation,
    seatTable,
    clearTable,
  };
}
```

- [ ] **Step 2: Wire it into `app/page.tsx`**

Replace the contents of `app/page.tsx`:

```tsx
"use client";

import { useReservations } from "@/lib/useReservations";
import { StatusSummary } from "@/components/StatusSummary";
import { FloorPlan } from "@/components/FloorPlan";

export default function Home() {
  const { reservationsByTable, isPersistent, getStatus, summary } = useReservations();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">Table Reservations</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Bar and main dining floor plan</p>
        {!isPersistent && (
          <p className="mt-2 rounded-md bg-[var(--color-overdue-bg)] px-3 py-2 text-sm text-[var(--color-overdue-text)]">
            Your browser isn&apos;t saving changes between visits (private browsing?). Changes will be lost
            when you close this tab.
          </p>
        )}
      </header>
      <StatusSummary summary={summary} />
      <FloorPlan reservationsByTable={reservationsByTable} getStatus={getStatus} onSelectTable={() => {}} />
    </main>
  );
}
```

- [ ] **Step 3: Verify the app builds**

Run: `npm run build`
Expected: build completes successfully.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: same floor plan as Task 6 (all Available, no console errors). Open devtools → Application → Local Storage and confirm a `restaurant-reservations:v1` key now exists (written on first load). Refresh the page — no errors, same output.

- [ ] **Step 5: Commit**

```bash
git add lib/useReservations.ts app/page.tsx
git commit -m "Wire live state via useReservations hook"
```

---

### Task 8: Reservation panel (full add/seat/clear flow)

**Files:**
- Create: `components/ReservationPanel.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `Celebration`, `Reservation`, `ReservationInput`, `TimeLimitMinutes`, `validateReservationInput` from `lib/reservations.ts` (Task 3); `saveReservation`, `seatTable`, `clearTable` from `useReservations()` (Task 7).
- Produces: `<ReservationPanel tableNumber={number | null} reservation={Reservation | undefined} onSave={(tableNumber, input) => void} onSeat={(tableNumber, startTime) => void} onClear={(tableNumber) => void} onClose={() => void} />` — this is the final new component; `app/page.tsx` after this task uses the full hook surface with no more placeholders.

- [ ] **Step 1: Create `components/ReservationPanel.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  validateReservationInput,
  type Celebration,
  type Reservation,
  type ReservationInput,
  type TimeLimitMinutes,
} from "@/lib/reservations";

interface ReservationPanelProps {
  tableNumber: number | null;
  reservation: Reservation | undefined;
  onSave: (tableNumber: number, input: ReservationInput) => void;
  onSeat: (tableNumber: number, startTime: string) => void;
  onClear: (tableNumber: number) => void;
  onClose: () => void;
}

const CELEBRATIONS: Celebration[] = ["None", "Birthday", "Anniversary", "Engagement", "Other"];
const TIME_LIMITS: TimeLimitMinutes[] = [30, 60, 90, 120];

function emptyInput(): ReservationInput {
  return {
    guestName: "",
    partySize: 2,
    celebration: "None",
    allergies: "",
    reservationTime: "18:00",
    timeLimitMinutes: 90,
  };
}

export function ReservationPanel({
  tableNumber,
  reservation,
  onSave,
  onSeat,
  onClear,
  onClose,
}: ReservationPanelProps) {
  const [input, setInput] = useState<ReservationInput>(emptyInput);
  const [startTime, setStartTime] = useState("18:00");
  const [errors, setErrors] = useState<ReturnType<typeof validateReservationInput>["errors"]>({});

  useEffect(() => {
    if (reservation) {
      setInput({
        guestName: reservation.guestName,
        partySize: reservation.partySize,
        celebration: reservation.celebration,
        allergies: reservation.allergies,
        reservationTime: reservation.reservationTime,
        timeLimitMinutes: reservation.timeLimitMinutes,
      });
      setStartTime(reservation.startTime ?? reservation.reservationTime);
    } else {
      setInput(emptyInput());
      setStartTime("18:00");
    }
    setErrors({});
  }, [tableNumber, reservation]);

  if (tableNumber === null) return null;

  function handleSave() {
    const result = validateReservationInput(input);
    setErrors(result.errors);
    if (result.valid) {
      onSave(tableNumber as number, input);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-sm flex-col gap-4 overflow-y-auto bg-[var(--color-surface)] p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-[var(--color-text)]">Table {tableNumber}</h2>
          <button type="button" onClick={onClose} className="text-sm text-[var(--color-text-muted)]">
            Close
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Guest name
          <input
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            value={input.guestName}
            onChange={(event) => setInput({ ...input, guestName: event.target.value })}
          />
          {errors.guestName && <span className="text-xs text-[var(--color-overdue-text)]">{errors.guestName}</span>}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Party size
          <input
            type="number"
            min={1}
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            value={input.partySize}
            onChange={(event) => setInput({ ...input, partySize: Number(event.target.value) })}
          />
          {errors.partySize && <span className="text-xs text-[var(--color-overdue-text)]">{errors.partySize}</span>}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Special celebration
          <select
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            value={input.celebration}
            onChange={(event) => setInput({ ...input, celebration: event.target.value as Celebration })}
          >
            {CELEBRATIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Allergies / notes
          <textarea
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            value={input.allergies}
            onChange={(event) => setInput({ ...input, allergies: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Reservation time
          <input
            type="time"
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            value={input.reservationTime}
            onChange={(event) => setInput({ ...input, reservationTime: event.target.value })}
          />
          {errors.reservationTime && (
            <span className="text-xs text-[var(--color-overdue-text)]">{errors.reservationTime}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Time limit
          <select
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            value={input.timeLimitMinutes}
            onChange={(event) =>
              setInput({ ...input, timeLimitMinutes: Number(event.target.value) as TimeLimitMinutes })
            }
          >
            {TIME_LIMITS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} min
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 font-medium text-white hover:bg-[var(--color-accent-hover)]"
        >
          {reservation ? "Save changes" : "Add reservation"}
        </button>

        <div className="border-t border-[var(--color-border)] pt-4">
          <label className="flex flex-col gap-1 text-sm">
            Start time (when seated)
            <input
              type="time"
              className="rounded-md border border-[var(--color-border)] px-3 py-2"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Final time is calculated automatically as start time + time limit.
          </p>
          {reservation?.finalTime && (
            <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
              Final time: {reservation.finalTime}
            </p>
          )}
          <button
            type="button"
            disabled={!reservation}
            onClick={() => onSeat(tableNumber as number, startTime)}
            className="mt-2 w-full rounded-md border border-[var(--color-accent)] px-4 py-2 font-medium text-[var(--color-accent)] disabled:opacity-40"
          >
            Seat now
          </button>
        </div>

        {reservation && (
          <button
            type="button"
            onClick={() => onClear(tableNumber as number)}
            className="mt-auto rounded-md border border-[var(--color-overdue-border)] px-4 py-2 font-medium text-[var(--color-overdue-text)]"
          >
            Clear table
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `app/page.tsx`**

Replace the contents of `app/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useReservations } from "@/lib/useReservations";
import { StatusSummary } from "@/components/StatusSummary";
import { FloorPlan } from "@/components/FloorPlan";
import { ReservationPanel } from "@/components/ReservationPanel";

export default function Home() {
  const { reservationsByTable, isPersistent, getStatus, summary, saveReservation, seatTable, clearTable } =
    useReservations();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">Table Reservations</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Bar and main dining floor plan</p>
        {!isPersistent && (
          <p className="mt-2 rounded-md bg-[var(--color-overdue-bg)] px-3 py-2 text-sm text-[var(--color-overdue-text)]">
            Your browser isn&apos;t saving changes between visits (private browsing?). Changes will be lost
            when you close this tab.
          </p>
        )}
      </header>

      <StatusSummary summary={summary} />

      <FloorPlan
        reservationsByTable={reservationsByTable}
        getStatus={getStatus}
        onSelectTable={setSelectedTable}
      />

      <ReservationPanel
        tableNumber={selectedTable}
        reservation={selectedTable !== null ? reservationsByTable[selectedTable] : undefined}
        onSave={(tableNumber, input) => saveReservation(tableNumber, input)}
        onSeat={(tableNumber, startTime) => seatTable(tableNumber, startTime)}
        onClear={(tableNumber) => {
          clearTable(tableNumber);
          setSelectedTable(null);
        }}
        onClose={() => setSelectedTable(null)}
      />
    </main>
  );
}
```

- [ ] **Step 3: Verify the app builds**

Run: `npm run build`
Expected: build completes successfully.

- [ ] **Step 4: Manually verify the full flow in the browser**

Run: `npm run dev`, open `http://localhost:3000`, and walk through:
1. Click table `31`. Try to save with an empty guest name → see the "Guest name is required." error, nothing saved.
2. Fill in guest name "Sam Lee", party size 4, celebration "Birthday", reservation time `19:00`, time limit `90 min`. Click "Add reservation". Panel stays open; table `31` on the floor plan turns blue ("Reserved") and shows "Sam Lee · 4". Reserved count in the summary bar increases to 1.
3. Reopen table `31`, set Start time to the current time, click "Seat now". Table turns amber ("Occupied"); "Final time" shows current time + 90 minutes. Occupied count increases, Reserved count decreases.
4. Reopen table `31`, set Start time to something in the past such that now is more than 90 minutes later (e.g. set it several hours earlier), click "Seat now" again. Table turns red ("Overdue"). Overdue count increases.
5. Reopen table `31`, click "Clear table". Table returns to gray ("Available"); all counts reset accordingly.
6. Refresh the browser entirely. Confirm whatever state you left tables in (steps 2–4, on any other table you didn't clear) is still there — persistence works.

- [ ] **Step 5: Commit**

```bash
git add components/ReservationPanel.tsx app/page.tsx
git commit -m "Add reservation panel with full add/seat/clear flow"
```

---

### Task 9: Final polish, README, and full QA pass

**Files:**
- Create: `README.md`

**Interfaces:** None — this task adds documentation and runs the full verification suite; no new code interfaces.

- [ ] **Step 1: Create `README.md`**

```md
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
```

- [ ] **Step 2: Run the full check suite**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: all four steps pass with no errors.

- [ ] **Step 3: Manual full QA pass**

Run: `npm run dev`, open `http://localhost:3000`, and re-run the full walkthrough from Task 8 Step 4 once more end-to-end, on a fresh table, to confirm nothing regressed.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Add README and finish demo QA pass"
```
