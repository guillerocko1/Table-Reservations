// A short, fixed-size roster the admin fills in once (e.g. "Alex", "Sam")
// so staff pick a server from a dropdown instead of retyping a name on
// every reservation. Slots start empty - nothing to configure up front.
export const MAX_SERVERS = 5;

export interface ServerRow {
  slot_index: number;
  name: string;
}

// Postgres doesn't guarantee row order without an explicit ORDER BY, and a
// slot could in principle be missing (e.g. the seed insert hasn't run yet)
// - this always returns exactly MAX_SERVERS entries in slot order, padding
// any missing slot with "".
export function rowsToServerNames(rows: ServerRow[]): string[] {
  const byIndex = new Map(rows.map((row) => [row.slot_index, row.name]));
  return Array.from({ length: MAX_SERVERS }, (_, index) => byIndex.get(index) ?? "");
}
