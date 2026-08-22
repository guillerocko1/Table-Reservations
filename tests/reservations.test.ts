import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFinalTime,
  statusFor,
  updateReservationFields,
  validateReservationInput,
  summarizeStatuses,
  type Reservation,
  type ReservationInput,
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

function makeInput(overrides: Partial<ReservationInput> = {}): ReservationInput {
  return {
    guestName: "Alex Rivera",
    partySize: 2,
    celebration: "None",
    allergies: "",
    reservationTime: "18:00",
    timeLimitMinutes: 90,
    ...overrides,
  };
}

test("updateReservationFields: brand new table stays unseated with no finalTime", () => {
  const result = updateReservationFields(undefined, 1, makeInput());
  assert.equal(result.startTime, null);
  assert.equal(result.finalTime, null);
});

test("updateReservationFields: editing an unseated reservation still has no finalTime", () => {
  const existing = makeReservation({ startTime: null, finalTime: null, timeLimitMinutes: 60 });
  const result = updateReservationFields(existing, 1, makeInput({ timeLimitMinutes: 120 }));
  assert.equal(result.startTime, null);
  assert.equal(result.finalTime, null);
  assert.equal(result.timeLimitMinutes, 120);
});

test("updateReservationFields: changing timeLimitMinutes on a seated table recomputes finalTime", () => {
  // Regression test: seat a table at 18:00 with a 60-minute limit, then edit
  // just the time limit to 120 minutes — finalTime must move from 19:00 to
  // 20:00 instead of staying frozen at the value computed at seat-time.
  const existing = makeReservation({ startTime: "18:00", finalTime: "19:00", timeLimitMinutes: 60 });
  const result = updateReservationFields(existing, 1, makeInput({ timeLimitMinutes: 120 }));
  assert.equal(result.startTime, "18:00");
  assert.equal(result.finalTime, "20:00");
});

test("updateReservationFields: unrelated field edits on a seated table keep startTime and recompute finalTime", () => {
  const existing = makeReservation({ startTime: "18:00", finalTime: "19:30", timeLimitMinutes: 90 });
  const result = updateReservationFields(existing, 1, makeInput({ guestName: "Jordan Lee", timeLimitMinutes: 90 }));
  assert.equal(result.startTime, "18:00");
  assert.equal(result.finalTime, "19:30");
  assert.equal(result.guestName, "Jordan Lee");
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
