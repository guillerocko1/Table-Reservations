import { test } from "node:test";
import assert from "node:assert/strict";
import { rowToEmployee, type EmployeeRow } from "../lib/employeeRows.ts";

test("rowToEmployee: maps snake_case columns to the app's camelCase fields", () => {
  const row: EmployeeRow = { id: 4, name: "Michelle", created_at: "2026-01-01T00:00:00.000Z" };
  assert.deepEqual(rowToEmployee(row), { id: 4, name: "Michelle" });
});
