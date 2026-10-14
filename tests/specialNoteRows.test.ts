import { test } from "node:test";
import assert from "node:assert/strict";
import { rowToSpecialNote, type SpecialNoteRow } from "../lib/specialNoteRows.ts";

test("rowToSpecialNote: maps snake_case columns to the app's camelCase fields", () => {
  const row: SpecialNoteRow = {
    id: 3,
    note_date: "2026-01-15",
    employee_name: "Michelle",
    note: "Covered an extra shift without being asked.",
    notify_at: null,
    created_at: "2026-01-15T00:00:00.000Z",
  };
  assert.deepEqual(rowToSpecialNote(row), {
    id: 3,
    noteDate: "2026-01-15",
    employeeName: "Michelle",
    note: "Covered an extra shift without being asked.",
    notifyAt: null,
  });
});

test("rowToSpecialNote: carries a scheduled notify_at through", () => {
  const row: SpecialNoteRow = {
    id: 4,
    note_date: "2026-01-15",
    employee_name: "Michelle",
    note: "Covered an extra shift without being asked.",
    notify_at: "2026-01-16T15:00:00.000Z",
    created_at: "2026-01-15T00:00:00.000Z",
  };
  assert.deepEqual(rowToSpecialNote(row), {
    id: 4,
    noteDate: "2026-01-15",
    employeeName: "Michelle",
    note: "Covered an extra shift without being asked.",
    notifyAt: "2026-01-16T15:00:00.000Z",
  });
});
