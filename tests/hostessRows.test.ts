import { test } from "node:test";
import assert from "node:assert/strict";
import { rowToHostess, type HostessRow } from "../lib/hostessRows.ts";

test("rowToHostess: maps snake_case columns to the app's camelCase fields", () => {
  const row: HostessRow = { id: 2, name: "Priscilla", created_at: "2026-01-01T00:00:00.000Z" };
  assert.deepEqual(rowToHostess(row), { id: 2, name: "Priscilla" });
});
