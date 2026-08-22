import { test } from "node:test";
import assert from "node:assert/strict";
import { ZONES, ALL_TABLE_NUMBERS } from "../lib/tables.ts";

test("bar zone covers tables 1 to 16", () => {
  const bar = ZONES.find((zone) => zone.id === "bar");
  assert.ok(bar);
  assert.deepEqual(bar.tableNumbers, Array.from({ length: 16 }, (_, i) => i + 1));
});

test("main dining zones cover the documented ranges", () => {
  const expected: Record<string, number[]> = {
    "main-a": [31, 32, 33, 34, 35, 36, 37],
    "main-b": [41, 42, 43, 44, 45, 46, 47],
    "main-c": [51, 52, 53, 54, 55, 56],
    "main-d": [61, 62, 63],
  };
  for (const [id, numbers] of Object.entries(expected)) {
    const zone = ZONES.find((z) => z.id === id);
    assert.ok(zone, `missing zone ${id}`);
    assert.deepEqual(zone.tableNumbers, numbers);
  }
});

test("all table numbers are unique across zones and total 39", () => {
  assert.equal(ALL_TABLE_NUMBERS.length, 39);
  assert.equal(new Set(ALL_TABLE_NUMBERS).size, ALL_TABLE_NUMBERS.length);
});
