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
