"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addEightySixedItem,
  fetchEightySixedItems,
  removeEightySixedItem,
  subscribeToEightySixedItems,
} from "./eightySixStore";
import type { EightySixItem } from "./eightySixRows";

export interface UseEightySixedItemsResult {
  items: EightySixItem[];
  isConnected: boolean;
  addItem: (dishName: string) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
}

export function useEightySixedItems(): UseEightySixedItemsResult {
  const [items, setItems] = useState<EightySixItem[]>([]);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchEightySixedItems()
      .then((fetched) => {
        if (!cancelled) setItems(fetched);
      })
      .catch(() => {
        // A failed initial fetch just leaves the list empty until a
        // realtime update (or a future successful fetch) populates it —
        // not surfaced as a blocking error, same reasoning as the server
        // roster: this list isn't essential to using the rest of the app.
      });

    const unsubscribe = subscribeToEightySixedItems(
      (fetched) => {
        if (!cancelled) setItems(fetched);
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

  const addItem = useCallback(async (dishName: string) => {
    // A negative, timestamp-based temporary id — guaranteed not to collide
    // with a real database-generated id — shown optimistically until the
    // insert's own realtime echo replaces the whole list with the real row.
    const tempId = -Date.now();
    setItems((current) => [...current, { id: tempId, dishName }]);
    try {
      await addEightySixedItem(dishName);
    } catch (error) {
      setItems((current) => current.filter((item) => item.id !== tempId));
      throw error;
    }
  }, []);

  const removeItem = useCallback(
    async (id: number) => {
      // Scoped to the one removed item (not a whole-list snapshot) so a
      // realtime update for a different item arriving while this delete is
      // in flight isn't discarded by the rollback — same reasoning as
      // useReservations' per-table rollback.
      const removed = items.find((item) => item.id === id);
      setItems((current) => current.filter((item) => item.id !== id));
      try {
        await removeEightySixedItem(id);
      } catch (error) {
        if (removed) {
          setItems((current) => [...current, removed]);
        }
        throw error;
      }
    },
    [items],
  );

  return { items, isConnected, addItem, removeItem };
}
