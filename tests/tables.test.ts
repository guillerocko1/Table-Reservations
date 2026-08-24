import { test } from "node:test";
import assert from "node:assert/strict";
import { ZONES, ALL_TABLE_NUMBERS, isRoundTable } from "../lib/tables.ts";

test("bar-lounge zone covers tables 61 to 63, displayed top to bottom as 63, 62, 61", () => {
  const barLounge = ZONES.find((zone) => zone.id === "bar-lounge");
  assert.ok(barLounge);
  assert.deepEqual(barLounge.tableNumbers, [63, 62, 61]);
});

test("bar zone covers tables 1 to 16, displayed right to left as 16 down to 1", () => {
  const bar = ZONES.find((zone) => zone.id === "bar");
  assert.ok(bar);
  assert.deepEqual(bar.tableNumbers, Array.from({ length: 16 }, (_, i) => 16 - i));
});

test("high-tops zone covers tables 21 to 29, displayed right to left as 29 down to 21", () => {
  const highTops = ZONES.find((zone) => zone.id === "high-tops");
  assert.ok(highTops);
  assert.deepEqual(highTops.tableNumbers, Array.from({ length: 9 }, (_, i) => 29 - i));
});

test("main dining zones cover the documented ranges, displayed right to left", () => {
  const expected: Record<string, number[]> = {
    "main-a": [37, 36, 35, 34, 33, 32, 31],
    "main-b": [47, 46, 45, 44, 43, 42, 41],
    "main-c": [56, 55, 54, 53, 52, 51],
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

test("isRoundTable: only table 56 is the round booth", () => {
  assert.equal(isRoundTable(56), true);
  assert.equal(isRoundTable(55), false);
  assert.equal(isRoundTable(51), false);
});
