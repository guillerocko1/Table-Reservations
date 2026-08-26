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
