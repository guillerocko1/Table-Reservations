// Postgres row shape (snake_case, matching supabase/schema.sql) — kept
// separate from the app's SpecialNote type (camelCase) so a schema change
// only touches this one mapping function.
export interface SpecialNoteRow {
  id: number;
  note_date: string;
  employee_name: string;
  note: string;
  notify_at: string | null;
  notified_at: string | null;
  created_at: string;
}

export interface SpecialNote {
  id: number;
  noteDate: string;
  employeeName: string;
  note: string;
  notifyAt: string | null;
  notifiedAt: string | null;
  createdAt: string;
}

export function rowToSpecialNote(row: SpecialNoteRow): SpecialNote {
  return {
    id: row.id,
    noteDate: row.note_date,
    employeeName: row.employee_name,
    note: row.note,
    notifyAt: row.notify_at,
    notifiedAt: row.notified_at,
    createdAt: row.created_at,
  };
}
