import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ZONES,
  ALL_TABLE_NUMBERS,
  isRoundTable,
  isSmallTable,
  isWideTable,
  isMediumWideTable,
} from "../lib/tables.ts";

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

test("isSmallTable: only the eight documented 2-top tables are small", () => {
  const small = [31, 32, 35, 37, 41, 43, 46, 47];
  for (const tableNumber of small) {
    assert.equal(isSmallTable(tableNumber), true, `expected ${tableNumber} to be small`);
  }
  const notSmall = [33, 34, 36, 42, 44, 45];
  for (const tableNumber of notSmall) {
    assert.equal(isSmallTable(tableNumber), false, `expected ${tableNumber} not to be small`);
  }
});

test("isWideTable: only tables 34 and 44 are wide", () => {
  assert.equal(isWideTable(34), true);
  assert.equal(isWideTable(44), true);
  assert.equal(isWideTable(33), false);
  assert.equal(isWideTable(45), false);
});

test("isMediumWideTable: only tables 33, 36, 42, and 45 are medium-wide", () => {
  const mediumWide = [33, 36, 42, 45];
  for (const tableNumber of mediumWide) {
    assert.equal(isMediumWideTable(tableNumber), true, `expected ${tableNumber} to be medium-wide`);
  }
  const notMediumWide = [31, 32, 34, 35, 37, 41, 43, 44, 46, 47];
  for (const tableNumber of notMediumWide) {
    assert.equal(isMediumWideTable(tableNumber), false, `expected ${tableNumber} not to be medium-wide`);
  }
});

test("small, medium-wide, and wide table lists partition the two dining rows with no overlap", () => {
  const small = [31, 32, 35, 37, 41, 43, 46, 47];
  const wide = [34, 44];
  const mediumWide = [33, 36, 42, 45];
  const mainA = ZONES.find((z) => z.id === "main-a")?.tableNumbers ?? [];
  const mainB = ZONES.find((z) => z.id === "main-b")?.tableNumbers ?? [];
  const allDiningTables = [...mainA, ...mainB];

  assert.deepEqual(
    [...small, ...wide, ...mediumWide].sort((a, b) => a - b),
    [...allDiningTables].sort((a, b) => a - b),
  );
  for (const tableNumber of mediumWide) {
    assert.equal(isSmallTable(tableNumber), false);
    assert.equal(isWideTable(tableNumber), false);
  }
  for (const tableNumber of small) {
    assert.equal(isMediumWideTable(tableNumber), false);
    assert.equal(isWideTable(tableNumber), false);
  }
});
