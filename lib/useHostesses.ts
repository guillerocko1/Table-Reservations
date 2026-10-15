"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addHostess as addHostessRow,
  fetchHostesses,
  removeHostess as removeHostessRow,
  subscribeToHostesses,
  updateHostessName as updateHostessNameRow,
} from "./hostessStore";
import type { Hostess } from "./hostessRows";

export interface UseHostessesResult {
  hostesses: Hostess[];
  isConnected: boolean;
  addHostess: (name: string) => Promise<void>;
  updateHostess: (id: number, name: string) => Promise<void>;
  removeHostess: (id: number) => Promise<void>;
}

function byName(a: Hostess, b: Hostess): number {
  return a.name.localeCompare(b.name);
}

export function useHostesses(): UseHostessesResult {
  const [hostesses, setHostesses] = useState<Hostess[]>([]);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchHostesses()
      .then((fetched) => {
        if (!cancelled) setHostesses(fetched);
      })
      .catch(() => {
        // A failed initial fetch just leaves the list empty until a
        // realtime update (or a future successful fetch) populates it -
        // not surfaced as a blocking error, same reasoning as the 86'd
        // items list: this list isn't essential to using the rest of the app.
      });

    const unsubscribe = subscribeToHostesses(
      (fetched) => {
        if (!cancelled) setHostesses(fetched);
      },
      (status) => {
        if (!cancelled) setIsConnected(status === "connected");
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const addHostess = useCallback(async (name: string) => {
    // A negative, timestamp-based temporary id - guaranteed not to collide
    // with a real database-generated id - shown optimistically until the
    // insert's own realtime echo replaces the whole list with the real row.
    const tempId = -Date.now();
    setHostesses((current) => [...current, { id: tempId, name }].sort(byName));
    try {
      await addHostessRow(name);
    } catch (error) {
      setHostesses((current) => current.filter((hostess) => hostess.id !== tempId));
      throw error;
    }
  }, []);

  const updateHostess = useCallback(
    async (id: number, name: string) => {
      // Scoped to the one renamed hostess (not a whole-list snapshot) so a
      // realtime update for a different hostess arriving while this update
      // is in flight isn't discarded by the rollback - same reasoning as
      // useEmployees' per-item rollback.
      const previous = hostesses.find((hostess) => hostess.id === id);
      setHostesses((current) =>
        current.map((hostess) => (hostess.id === id ? { ...hostess, name } : hostess)).sort(byName),
      );
      try {
        await updateHostessNameRow(id, name);
      } catch (error) {
        if (previous) {
          setHostesses((current) => current.map((hostess) => (hostess.id === id ? previous : hostess)).sort(byName));
        }
        throw error;
      }
    },
    [hostesses],
  );

  const removeHostess = useCallback(
    async (id: number) => {
      const removed = hostesses.find((hostess) => hostess.id === id);
      setHostesses((current) => current.filter((hostess) => hostess.id !== id));
      try {
        await removeHostessRow(id);
      } catch (error) {
        if (removed) {
          setHostesses((current) => [...current, removed].sort(byName));
        }
        throw error;
      }
    },
    [hostesses],
  );

  return { hostesses, isConnected, addHostess, updateHostess, removeHostess };
}
