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
    tags: [],
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
