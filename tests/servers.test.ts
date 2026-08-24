import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore } from "../lib/store.ts";
import { MAX_SERVERS, loadServerNames, saveServerNames } from "../lib/servers.ts";

test("loadServerNames: an empty store returns 5 empty slots", () => {
  const store = createMemoryStore();
  const names = loadServerNames(store);
  assert.equal(names.length, MAX_SERVERS);
  assert.deepEqual(names, ["", "", "", "", ""]);
});

test("saveServerNames then loadServerNames round-trips the roster", () => {
  const store = createMemoryStore();
  saveServerNames(store, ["Alex", "Sam", "Jordan", "Taylor", "Casey"]);
  assert.deepEqual(loadServerNames(store), ["Alex", "Sam", "Jordan", "Taylor", "Casey"]);
});

test("loadServerNames: pads a partially-filled roster out to 5 slots", () => {
  const store = createMemoryStore();
  saveServerNames(store, ["Alex", "Sam"]);
  assert.deepEqual(loadServerNames(store), ["Alex", "Sam", "", "", ""]);
});

test("saveServerNames: truncates anything past 5 names", () => {
  const store = createMemoryStore();
  saveServerNames(store, ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Extra"]);
  assert.deepEqual(loadServerNames(store), ["Alex", "Sam", "Jordan", "Taylor", "Casey"]);
});

test("loadServerNames: corrupted data falls back to 5 empty slots instead of crashing", () => {
  const store = createMemoryStore();
  store.setItem("restaurant-reservations:servers:v1", "{{{not json");
  assert.deepEqual(loadServerNames(store), ["", "", "", "", ""]);
});
