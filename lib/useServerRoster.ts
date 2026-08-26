"use client";

import { useCallback, useEffect, useState } from "react";
import { MAX_SERVERS, fetchServerNames, setServerNameRemote, subscribeToServers } from "./servers";

export interface UseServerRosterResult {
  serverNames: string[];
  isConnected: boolean;
  setServerName: (index: number, name: string) => Promise<void>;
}

export function useServerRoster(): UseServerRosterResult {
  const [serverNames, setServerNames] = useState<string[]>(() => Array(MAX_SERVERS).fill(""));
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchServerNames()
      .then((names) => {
        if (!cancelled) setServerNames(names);
      })
      .catch(() => {
        // A failed initial fetch leaves the roster at its all-empty
        // default; the dropdown just shows "Unassigned" until the next
        // successful sync. Not surfaced as a blocking error - the server
        // roster isn't essential to using the rest of the app.
      });

    const unsubscribe = subscribeToServers(
      (names) => {
        if (!cancelled) setServerNames(names);
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

  const setServerName = useCallback(
    async (index: number, name: string) => {
      const previous = serverNames[index];
      setServerNames((current) => {
        const next = [...current];
        next[index] = name;
        return next;
      });
      try {
        await setServerNameRemote(index, name);
      } catch (error) {
        // Scoped to this one slot (not the whole array) so a realtime
        // update to a different slot that arrived while this write was in
        // flight isn't discarded by the rollback — same reasoning as
        // useReservations' per-table rollback.
        setServerNames((current) => {
          const next = [...current];
          next[index] = previous;
          return next;
        });
        throw error;
      }
    },
    [serverNames],
  );

  return { serverNames, isConnected, setServerName };
}
