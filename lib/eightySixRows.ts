// Postgres row shape (snake_case, matching supabase/schema.sql) — kept
// separate from the app's EightySixItem type (camelCase) so a schema
// change only touches this one mapping function.
export interface EightySixRow {
  id: number;
  dish_name: string;
  created_at: string;
}

export interface EightySixItem {
  id: number;
  dishName: string;
}

export function rowToEightySixItem(row: EightySixRow): EightySixItem {
  return {
    id: row.id,
    dishName: row.dish_name,
  };
}
