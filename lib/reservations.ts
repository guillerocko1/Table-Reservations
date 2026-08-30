export type Celebration = "None" | "Birthday" | "Anniversary" | "Engagement" | "Other";
export type TimeLimitMinutes = 30 | 45 | 60 | 75 | 90 | 105 | 120 | 135;
export type ReservationStatus = "available" | "reserved" | "occupied" | "overdue";

// A guest can carry any number of these at once (e.g. "VIP" + "Regular"),
// so this is a multi-select, not a single Celebration-style choice.
export type GuestTag =
  | "Alert the Chef"
  | "Alert the Manager"
  | "Bird Dog"
  | "Blogger"
  | "Critic"
  | "Employee"
  | "Friend of Employee"
  | "Friend of Owner"
  | "Insurance Table"
  | "Investor"
  | "Regular"
  | "Rush"
  | "VIP";

export const GUEST_TAGS: GuestTag[] = [
  "Alert the Chef",
  "Alert the Manager",
  "Bird Dog",
  "Blogger",
  "Critic",
  "Employee",
  "Friend of Employee",
  "Friend of Owner",
  "Insurance Table",
  "Investor",
  "Regular",
  "Rush",
  "VIP",
];

export interface Reservation {
  tableNumber: number;
  guestName: string;
  tags: GuestTag[];
  partySize: number;
  celebration: Celebration;
  allergies: string;
  reservationTime: string;
  startTime: string | null;
  timeLimitMinutes: TimeLimitMinutes;
  finalTime: string | null;
  /** The staff member serving this table — free text, optional. */
  serverName: string;
}

export interface ReservationInput {
  guestName: string;
  tags: GuestTag[];
  partySize: number;
  celebration: Celebration;
  allergies: string;
  reservationTime: string;
  timeLimitMinutes: TimeLimitMinutes;
  serverName: string;
}

export interface StatusSummary {
  available: number;
  reserved: number;
  occupied: number;
  overdue: number;
}

const VALID_TIME_LIMITS: TimeLimitMinutes[] = [30, 45, 60, 75, 90, 105, 120, 135];

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

// Formats a Date as a 24-hour "HH:mm" string, zero-padded — the same
// format startTime/reservationTime/finalTime use everywhere in this
// module. Used to seat a table "now" without asking the caller to build
// the string by hand.
export function formatHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// Formats a 24-hour "HH:mm" string for display as 12-hour with AM/PM, e.g.
// "20:00" -> "8:00 PM", "00:00" -> "12:00 AM", "12:30" -> "12:30 PM". Purely
// a display concern — stored/compared times stay 24-hour "HH:mm" everywhere
// else in this module.
export function formatTime12Hour(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

// Builds the next Reservation record for a save: form fields always come
// from `input`, but `startTime` carries over from `existing` (a table isn't
// re-seated just because its details were edited), and `finalTime` must be
// re-derived from `timeLimitMinutes` every time since the caller may have
// just changed it on an already-seated table. `seatAt`, when given, seats
// a table that isn't already seated as part of this same save (the admin
// form's single Save/Seat button) — it's ignored once a table already has
// a startTime, since editing details shouldn't reset a table's clock.
export function updateReservationFields(
  existing: Reservation | undefined,
  tableNumber: number,
  input: ReservationInput,
  seatAt?: string,
): Reservation {
  const startTime = existing?.startTime ?? seatAt ?? null;
  return {
    tableNumber,
    guestName: input.guestName,
    tags: input.tags,
    partySize: input.partySize,
    celebration: input.celebration,
    allergies: input.allergies,
    reservationTime: input.reservationTime,
    timeLimitMinutes: input.timeLimitMinutes,
    startTime,
    finalTime: startTime ? computeFinalTime(startTime, input.timeLimitMinutes) : null,
    serverName: input.serverName,
  };
}

// Whole minutes elapsed since a table was seated. Same-day-only limitation
// as the rest of this module (see timeToMinutes above); clamps to 0 rather
// than going negative if startTime is somehow after now.
export function minutesSince(startTime: string, now: Date): number {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return Math.max(0, nowMinutes - timeToMinutes(startTime));
}

// Whole minutes remaining before a table's final time. Same-day-only
// limitation as the rest of this module; clamps to 0 once the final time
// has passed (an overdue table shows 0 minutes left, not a negative count).
export function minutesUntil(finalTime: string, now: Date): number {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return Math.max(0, timeToMinutes(finalTime) - nowMinutes);
}

export function statusFor(reservation: Reservation | undefined, now: Date): ReservationStatus {
  if (!reservation) return "available";
  if (!reservation.startTime || !reservation.finalTime) return "reserved";
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const finalMinutes = timeToMinutes(reservation.finalTime);
  return nowMinutes > finalMinutes ? "overdue" : "occupied";
}

// "warning" is the only tier that isn't also a ReservationStatus — it's an
// extra rung inserted between "occupied" and "overdue" for the floor plan's
// color gradient (green/blue/yellow/red), without changing what counts as
// "occupied" vs "overdue" for status labels or the summary bar.
export type ColorTier = ReservationStatus | "warning";

// Grades an occupied table's color by urgency: plenty of time left stays
// "occupied" (blue), 30 minutes or less left becomes "warning" (yellow),
// and 15 minutes or less left is treated the same as "overdue" (red) — a
// table that's about to run out and one that already has both need staff's
// attention right away. Every other status passes through unchanged.
export function colorTierFor(status: ReservationStatus, reservation: Reservation | undefined, now: Date): ColorTier {
  if (status !== "occupied") return status;
  // statusFor only returns "occupied" when reservation and finalTime are
  // both set, so this read is safe.
  const minutesLeft = minutesUntil(reservation!.finalTime!, now);
  if (minutesLeft <= 15) return "overdue";
  if (minutesLeft <= 30) return "warning";
  return "occupied";
}

export function validateReservationInput(
  input: ReservationInput,
): { valid: boolean; errors: Partial<Record<keyof ReservationInput, string>> } {
  const errors: Partial<Record<keyof ReservationInput, string>> = {};

  // Guest name is no longer collected on the admin form (see
  // ReservationPanel), so it's no longer required here either.
  if (!Number.isInteger(input.partySize) || input.partySize < 1) {
    errors.partySize = "Party size must be a whole number of at least 1.";
  }
  if (!VALID_TIME_LIMITS.includes(input.timeLimitMinutes)) {
    errors.timeLimitMinutes = "Time limit must be 30, 45, 60, 75, 90, 105, 120, or 135 minutes.";
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

export interface ServerGroup {
  serverName: string;
  reservations: Reservation[];
}

// Groups reservations by their assigned server for the "by server" view.
// Tables with no server picked are skipped entirely (no "Unassigned"
// bucket), and a server with nothing currently assigned just doesn't
// appear — this only ever lists servers who actually have tables right
// now. Groups are ordered to match the roster's slot order first, so the
// list reads in the order the admin set the roster up in; any server name
// that isn't a current roster slot (e.g. a renamed or removed slot whose
// reservations still carry the old name) is grouped separately, sorted
// alphabetically, after the roster names. Within a server's group, tables
// are sorted by table number.
export function groupReservationsByServer(
  reservationsByTable: Record<number, Reservation>,
  rosterOrder: string[],
): ServerGroup[] {
  const byServer = new Map<string, Reservation[]>();
  for (const reservation of Object.values(reservationsByTable)) {
    if (!reservation.serverName) continue;
    const existing = byServer.get(reservation.serverName) ?? [];
    existing.push(reservation);
    byServer.set(reservation.serverName, existing);
  }

  for (const reservations of byServer.values()) {
    reservations.sort((a, b) => a.tableNumber - b.tableNumber);
  }

  const rostered = rosterOrder.filter((name) => byServer.has(name));
  const extras = Array.from(byServer.keys())
    .filter((name) => !rosterOrder.includes(name))
    .sort((a, b) => a.localeCompare(b));

  return [...rostered, ...extras].map((serverName) => ({
    serverName,
    reservations: byServer.get(serverName)!,
  }));
}
