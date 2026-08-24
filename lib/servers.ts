import type { KeyValueStore } from "./store.ts";

// A short, fixed-size roster the admin fills in once (e.g. "Alex", "Sam")
// so staff pick a server from a dropdown instead of retyping a name on
// every reservation. Slots start empty — nothing to configure up front.
export const MAX_SERVERS = 5;

const SERVERS_STORAGE_KEY = "restaurant-reservations:servers:v1";

// Always returns exactly MAX_SERVERS entries (padding with "" or truncating
// extra), so callers can index by slot without bounds-checking.
export function loadServerNames(store: KeyValueStore): string[] {
  const raw = store.getItem(SERVERS_STORAGE_KEY);
  const saved = raw ? parseServerNames(raw) : [];
  return Array.from({ length: MAX_SERVERS }, (_, index) => saved[index] ?? "");
}

function parseServerNames(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((name): name is string => typeof name === "string");
  } catch {
    return [];
  }
}

export function saveServerNames(store: KeyValueStore, names: string[]): void {
  store.setItem(SERVERS_STORAGE_KEY, JSON.stringify(names.slice(0, MAX_SERVERS)));
}
