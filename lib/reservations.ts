export type Celebration = "None" | "Birthday" | "Anniversary" | "Engagement" | "Other";
export type TimeLimitMinutes = 30 | 45 | 60 | 75 | 90 | 120 | 150;
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

const VALID_TIME_LIMITS: TimeLimitMinutes[] = [30, 45, 60, 75, 90, 120, 150];

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

// Builds the next Reservation record for a save: form fields always come
// from `input`, but `startTime` carries over from `existing` (a table isn't
// seated just because its details were edited), and `finalTime` must be
// re-derived from `timeLimitMinutes` every time since the caller may have
// just changed it on an already-seated table.
export function updateReservationFields(
  existing: Reservation | undefined,
  tableNumber: number,
  input: ReservationInput,
): Reservation {
  const startTime = existing?.startTime ?? null;
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
    errors.timeLimitMinutes = "Time limit must be 30, 45, 60, 75, 90, 120, or 150 minutes.";
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
