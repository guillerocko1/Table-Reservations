// Postgres row shape (snake_case, matching supabase/schema.sql) — kept
// separate from the app's Employee type (camelCase) so a schema change
// only touches this one mapping function.
export interface EmployeeRow {
  id: number;
  name: string;
  created_at: string;
}

export interface Employee {
  id: number;
  name: string;
}

export function rowToEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
  };
}
