import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_SERVERS, rowsToServerNames, type ServerRow } from "../lib/serverRows.ts";

test("rowsToServerNames: empty rows return 5 empty slots", () => {
  assert.deepEqual(rowsToServerNames([]), ["", "", "", "", ""]);
});

test("rowsToServerNames: places each row's name at its slot_index", () => {
  const rows: ServerRow[] = [
    { slot_index: 2, name: "Jordan" },
    { slot_index: 0, name: "Alex" },
    { slot_index: 1, name: "Sam" },
  ];
  assert.deepEqual(rowsToServerNames(rows), ["Alex", "Sam", "Jordan", "", ""]);
});

test("rowsToServerNames: pads any slot missing from the rows with \"\"", () => {
  const rows: ServerRow[] = [{ slot_index: 4, name: "Casey" }];
  assert.deepEqual(rowsToServerNames(rows), ["", "", "", "", "Casey"]);
});

test("rowsToServerNames: always returns MAX_SERVERS entries", () => {
  const rows: ServerRow[] = Array.from({ length: MAX_SERVERS }, (_, index) => ({
    slot_index: index,
    name: `Server ${index}`,
  }));
  assert.equal(rowsToServerNames(rows).length, MAX_SERVERS);
});
