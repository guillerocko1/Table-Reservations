import { test } from "node:test";
import assert from "node:assert/strict";
import { ZONES, ALL_TABLE_NUMBERS, isWideTable } from "../lib/tables.ts";

test("bar-lounge zone covers tables 61 to 63", () => {
  const barLounge = ZONES.find((zone) => zone.id === "bar-lounge");
  assert.ok(barLounge);
  assert.deepEqual(barLounge.tableNumbers, [61, 62, 63]);
});

test("bar zone covers tables 1 to 16", () => {
  const bar = ZONES.find((zone) => zone.id === "bar");
  assert.ok(bar);
  assert.deepEqual(bar.tableNumbers, Array.from({ length: 16 }, (_, i) => i + 1));
});

test("high-tops zone covers tables 21 to 29", () => {
  const highTops = ZONES.find((zone) => zone.id === "high-tops");
  assert.ok(highTops);
  assert.deepEqual(highTops.tableNumbers, Array.from({ length: 9 }, (_, i) => i + 21));
});

test("main dining zones cover the documented ranges", () => {
  const expected: Record<string, number[]> = {
    "main-a": [31, 32, 33, 34, 35, 36, 37],
    "main-b": [41, 42, 43, 44, 45, 46, 47],
    "main-c": [51, 52, 53, 54, 55, 56],
  };
  for (const [id, numbers] of Object.entries(expected)) {
    const zone = ZONES.find((z) => z.id === id);
    assert.ok(zone, `missing zone ${id}`);
    assert.deepEqual(zone.tableNumbers, numbers);
  }
});

test("bar and high-tops zones render as individual seats, dining zones as tables/booths", () => {
  const shapeById: Record<string, string> = Object.fromEntries(ZONES.map((zone) => [zone.id, zone.shape]));
  assert.equal(shapeById["bar"], "seat");
  assert.equal(shapeById["high-tops"], "seat");
  assert.equal(shapeById["bar-lounge"], "table");
  assert.equal(shapeById["main-a"], "table");
  assert.equal(shapeById["main-b"], "table");
  assert.equal(shapeById["main-c"], "booth");
});

test("all table numbers are unique across zones and total 48", () => {
  assert.equal(ALL_TABLE_NUMBERS.length, 48);
  assert.equal(new Set(ALL_TABLE_NUMBERS).size, ALL_TABLE_NUMBERS.length);
});

test("isWideTable: only flags the tables drawn wider in the real floor plan", () => {
  assert.equal(isWideTable(34), true);
  assert.equal(isWideTable(56), true);
  assert.equal(isWideTable(31), false);
  assert.equal(isWideTable(1), false);
});
