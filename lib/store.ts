import type { Reservation } from "./reservations.ts";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "restaurant-reservations:v1";
const PROBE_KEY = "restaurant-reservations:probe";

export function createMemoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

// Feature-detects a usable store — covers private browsing modes where
// localStorage exists but setItem throws (e.g. Safari's quota-exceeded).
export function isStoreAvailable(store: KeyValueStore): boolean {
  try {
    store.setItem(PROBE_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

export interface ReservationStore {
  getAll(): Record<number, Reservation>;
  save(reservation: Reservation): void;
  clear(tableNumber: number): void;
}

export function createReservationStore(store: KeyValueStore): ReservationStore {
  function readAll(): Record<number, Reservation> {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as Record<number, Reservation>;
      // Backfill fields added to the schema after some records were already
      // saved (e.g. `tags`), so data persisted by an older version of this
      // app doesn't crash code that assumes every field is always present.
      for (const reservation of Object.values(parsed)) {
        reservation.tags ??= [];
      }
      return parsed;
    } catch {
      return {};
    }
  }

  function writeAll(all: Record<number, Reservation>): void {
    store.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  return {
    getAll: readAll,
    save(reservation) {
      const all = readAll();
      all[reservation.tableNumber] = reservation;
      writeAll(all);
    },
    clear(tableNumber) {
      const all = readAll();
      delete all[tableNumber];
      writeAll(all);
    },
  };
}
