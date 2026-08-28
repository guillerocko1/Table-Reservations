import { test } from "node:test";
import assert from "node:assert/strict";
import {
  colorTierFor,
  computeFinalTime,
  formatTime12Hour,
  groupReservationsByServer,
  minutesSince,
  minutesUntil,
  statusFor,
  updateReservationFields,
  validateReservationInput,
  summarizeStatuses,
  GUEST_TAGS,
  type Reservation,
  type ReservationInput,
} from "../lib/reservations.ts";

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

test("computeFinalTime adds the time limit to the start time", () => {
  assert.equal(computeFinalTime("18:00", 30), "18:30");
  assert.equal(computeFinalTime("18:00", 60), "19:00");
  assert.equal(computeFinalTime("18:30", 90), "20:00");
  assert.equal(computeFinalTime("21:15", 120), "23:15");
});

test("formatTime12Hour: converts 24-hour HH:mm to 12-hour with AM/PM", () => {
  assert.equal(formatTime12Hour("00:00"), "12:00 AM");
  assert.equal(formatTime12Hour("08:05"), "8:05 AM");
  assert.equal(formatTime12Hour("12:00"), "12:00 PM");
  assert.equal(formatTime12Hour("13:15"), "1:15 PM");
  assert.equal(formatTime12Hour("20:00"), "8:00 PM");
  assert.equal(formatTime12Hour("23:45"), "11:45 PM");
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

test("colorTierFor: available and reserved pass through unchanged", () => {
  assert.equal(colorTierFor("available", undefined, new Date()), "available");
  const reserved = makeReservation();
  assert.equal(colorTierFor("reserved", reserved, new Date()), "reserved");
});

test("colorTierFor: overdue passes through unchanged", () => {
  const reservation = makeReservation({ startTime: "18:00", finalTime: "20:00" });
  const now = new Date();
  now.setHours(20, 30, 0, 0);
  assert.equal(colorTierFor("overdue", reservation, now), "overdue");
});

test("colorTierFor: occupied with more than 30 minutes left stays occupied", () => {
  const reservation = makeReservation({ startTime: "18:00", finalTime: "20:00" });
  const now = new Date();
  now.setHours(19, 0, 0, 0); // 60 min left
  assert.equal(colorTierFor("occupied", reservation, now), "occupied");
});

test("colorTierFor: occupied with 30 minutes or less left is a warning", () => {
  const reservation = makeReservation({ startTime: "18:00", finalTime: "20:00" });
  const now = new Date();
  now.setHours(19, 30, 0, 0); // exactly 30 min left
  assert.equal(colorTierFor("occupied", reservation, now), "warning");
});

test("colorTierFor: occupied with 15 minutes or less left is overdue-colored (critical)", () => {
  const reservation = makeReservation({ startTime: "18:00", finalTime: "20:00" });

  const fifteenLeft = new Date();
  fifteenLeft.setHours(19, 45, 0, 0); // exactly 15 min left
  assert.equal(colorTierFor("occupied", reservation, fifteenLeft), "overdue");

  const fiveLeft = new Date();
  fiveLeft.setHours(19, 55, 0, 0); // 5 min left
  assert.equal(colorTierFor("occupied", reservation, fiveLeft), "overdue");

  const zeroLeft = new Date();
  zeroLeft.setHours(20, 0, 0, 0); // 0 min left, right at the final time
  assert.equal(colorTierFor("occupied", reservation, zeroLeft), "overdue");
});

test("validateReservationInput: valid input has no errors", () => {
  const result = validateReservationInput({
    guestName: "Alex Rivera",
    tags: ["VIP"],
    partySize: 4,
    celebration: "Birthday",
    allergies: "peanuts",
    reservationTime: "18:00",
    timeLimitMinutes: 90,
    serverName: "Jamie",
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test("validateReservationInput: guest name is optional (the admin form no longer collects it)", () => {
  const result = validateReservationInput({
    guestName: "   ",
    tags: [],
    partySize: 2,
    celebration: "None",
    allergies: "",
    reservationTime: "18:00",
    timeLimitMinutes: 60,
    serverName: "",
  });
  assert.equal(result.valid, true);
  assert.equal(result.errors.guestName, undefined);
});

test("validateReservationInput: rejects zero or fractional party size", () => {
  const zero = validateReservationInput({
    guestName: "Alex",
    tags: [],
    partySize: 0,
    celebration: "None",
    allergies: "",
    reservationTime: "18:00",
    timeLimitMinutes: 60,
    serverName: "",
  });
  assert.equal(zero.valid, false);

  const fractional = validateReservationInput({
    guestName: "Alex",
    tags: [],
    partySize: 2.5,
    celebration: "None",
    allergies: "",
    reservationTime: "18:00",
    timeLimitMinutes: 60,
    serverName: "",
  });
  assert.equal(fractional.valid, false);
});

test("validateReservationInput: accepts every documented time limit, rejects anything else", () => {
  const validLimits = [30, 45, 60, 75, 90, 105, 120, 135] as const;
  for (const timeLimitMinutes of validLimits) {
    const result = validateReservationInput({
      guestName: "Alex",
      tags: [],
      partySize: 2,
      celebration: "None",
      allergies: "",
      reservationTime: "18:00",
      timeLimitMinutes,
      serverName: "",
    });
    assert.equal(result.valid, true, `expected ${timeLimitMinutes} to be a valid time limit`);
  }

  const result = validateReservationInput({
    guestName: "Alex",
    tags: [],
    partySize: 2,
    celebration: "None",
    allergies: "",
    reservationTime: "18:00",
    // @ts-expect-error — deliberately not one of the documented options
    timeLimitMinutes: 100,
    serverName: "",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.timeLimitMinutes);
});

function makeInput(overrides: Partial<ReservationInput> = {}): ReservationInput {
  return {
    guestName: "Alex Rivera",
    tags: [],
    partySize: 2,
    celebration: "None",
    allergies: "",
    reservationTime: "18:00",
    timeLimitMinutes: 90,
    serverName: "",
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

test("updateReservationFields: carries guest tags through from input", () => {
  const result = updateReservationFields(undefined, 1, makeInput({ tags: ["VIP", "Regular"] }));
  assert.deepEqual(result.tags, ["VIP", "Regular"]);
});

test("updateReservationFields: carries server name through from input", () => {
  const result = updateReservationFields(undefined, 1, makeInput({ serverName: "Jordan" }));
  assert.equal(result.serverName, "Jordan");
});

test("GUEST_TAGS: contains exactly the twelve documented tags", () => {
  assert.deepEqual(GUEST_TAGS, [
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
  ]);
});

test("minutesSince: counts whole minutes elapsed since start time", () => {
  const now = new Date();
  now.setHours(18, 23, 0, 0);
  assert.equal(minutesSince("18:00", now), 23);
});

test("minutesSince: zero right at the start time", () => {
  const now = new Date();
  now.setHours(18, 0, 0, 0);
  assert.equal(minutesSince("18:00", now), 0);
});

test("minutesUntil: counts whole minutes remaining before the final time", () => {
  const now = new Date();
  now.setHours(19, 15, 0, 0);
  assert.equal(minutesUntil("20:00", now), 45);
});

test("minutesUntil: zero right at the final time", () => {
  const now = new Date();
  now.setHours(20, 0, 0, 0);
  assert.equal(minutesUntil("20:00", now), 0);
});

test("minutesUntil: clamps to zero once the final time has passed (overdue)", () => {
  const now = new Date();
  now.setHours(20, 30, 0, 0);
  assert.equal(minutesUntil("20:00", now), 0);
});

test("minutesSince: clamps to zero for a start time later than now", () => {
  // Same-day-only limitation (see comment above timeToMinutes): a start
  // time after "now" shouldn't ever happen in normal use, but if it does
  // (e.g. a manually-edited future time), clamp rather than show negative.
  const now = new Date();
  now.setHours(18, 0, 0, 0);
  assert.equal(minutesSince("18:30", now), 0);
});

test("groupReservationsByServer: skips tables with no server assigned", () => {
  const reservationsByTable: Record<number, Reservation> = {
    5: makeReservation({ tableNumber: 5, serverName: "" }),
    6: makeReservation({ tableNumber: 6, serverName: "Jamie" }),
  };
  const groups = groupReservationsByServer(reservationsByTable, ["Jamie"]);
  assert.deepEqual(
    groups.map((g) => g.serverName),
    ["Jamie"],
  );
  assert.equal(groups[0].reservations.length, 1);
  assert.equal(groups[0].reservations[0].tableNumber, 6);
});

test("groupReservationsByServer: sorts a server's own tables by table number", () => {
  const reservationsByTable: Record<number, Reservation> = {
    12: makeReservation({ tableNumber: 12, serverName: "Jamie" }),
    3: makeReservation({ tableNumber: 3, serverName: "Jamie" }),
    7: makeReservation({ tableNumber: 7, serverName: "Jamie" }),
  };
  const groups = groupReservationsByServer(reservationsByTable, ["Jamie"]);
  assert.deepEqual(
    groups[0].reservations.map((r) => r.tableNumber),
    [3, 7, 12],
  );
});

test("groupReservationsByServer: orders servers by roster slot order", () => {
  const reservationsByTable: Record<number, Reservation> = {
    1: makeReservation({ tableNumber: 1, serverName: "Casey" }),
    2: makeReservation({ tableNumber: 2, serverName: "Alex" }),
  };
  // Roster lists Alex before Casey even though Casey's table number is
  // lower — the roster's configured order wins, not table number or name.
  const groups = groupReservationsByServer(reservationsByTable, ["Alex", "Casey"]);
  assert.deepEqual(
    groups.map((g) => g.serverName),
    ["Alex", "Casey"],
  );
});

test("groupReservationsByServer: a server with no tables right now doesn't appear", () => {
  const reservationsByTable: Record<number, Reservation> = {
    1: makeReservation({ tableNumber: 1, serverName: "Alex" }),
  };
  const groups = groupReservationsByServer(reservationsByTable, ["Alex", "Casey", "", "", ""]);
  assert.deepEqual(
    groups.map((g) => g.serverName),
    ["Alex"],
  );
});

test("groupReservationsByServer: a server name not in the roster still appears, after roster names, alphabetically", () => {
  const reservationsByTable: Record<number, Reservation> = {
    1: makeReservation({ tableNumber: 1, serverName: "Zara" }),
    2: makeReservation({ tableNumber: 2, serverName: "Alex" }),
    3: makeReservation({ tableNumber: 3, serverName: "Morgan" }),
  };
  // Only Alex is on the current roster (e.g. Zara and Morgan served under a
  // roster slot that's since been renamed) — Alex still sorts first, then
  // the non-roster names alphabetically.
  const groups = groupReservationsByServer(reservationsByTable, ["Alex"]);
  assert.deepEqual(
    groups.map((g) => g.serverName),
    ["Alex", "Morgan", "Zara"],
  );
});

test("groupReservationsByServer: empty input produces no groups", () => {
  assert.deepEqual(groupReservationsByServer({}, ["Alex", "Casey"]), []);
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
