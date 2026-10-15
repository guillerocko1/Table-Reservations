// Postgres row shape (snake_case, matching supabase/schema.sql) — kept
// separate from the app's Hostess type (camelCase) so a schema change
// only touches this one mapping function.
export interface HostessRow {
  id: number;
  name: string;
  created_at: string;
}

export interface Hostess {
  id: number;
  name: string;
}

export function rowToHostess(row: HostessRow): Hostess {
  return {
    id: row.id,
    name: row.name,
  };
}
