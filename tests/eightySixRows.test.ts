import { test } from "node:test";
import assert from "node:assert/strict";
import { rowToEightySixItem, type EightySixRow } from "../lib/eightySixRows.ts";

test("rowToEightySixItem: maps snake_case columns to the app's camelCase fields", () => {
  const row: EightySixRow = { id: 7, dish_name: "Salmon", created_at: "2026-01-01T00:00:00.000Z" };
  assert.deepEqual(rowToEightySixItem(row), { id: 7, dishName: "Salmon" });
});
