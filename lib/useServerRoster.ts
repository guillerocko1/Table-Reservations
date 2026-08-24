"use client";

import { useCallback, useEffect, useState } from "react";
import { MAX_SERVERS, loadServerNames, saveServerNames } from "./servers";
import { createMemoryStore, isStoreAvailable, type KeyValueStore } from "./store";

// Mirrors useReservations' SSR-safe pattern: the store's identity can
// differ between server and client (it's never rendered directly), but the
// slots themselves start as 5 empty strings everywhere and only pick up
// their real saved values in a post-mount effect.
function getBrowserStore(): KeyValueStore {
  if (typeof window !== "undefined" && isStoreAvailable(window.localStorage)) {
    return window.localStorage;
  }
  return createMemoryStore();
}

export interface UseServerRosterResult {
  serverNames: string[];
  setServerName: (index: number, name: string) => void;
}

export function useServerRoster(): UseServerRosterResult {
  const [store] = useState(getBrowserStore);
  const [serverNames, setServerNames] = useState<string[]>(() => Array(MAX_SERVERS).fill(""));

  useEffect(() => {
    setServerNames(loadServerNames(store));
  }, [store]);

  // Persist outside the state updater, same reason as useReservations: a
  // setState updater can run more than once (React Strict Mode), so a
  // localStorage write doesn't belong there.
  const setServerName = useCallback(
    (index: number, name: string) => {
      const next = [...serverNames];
      next[index] = name;
      saveServerNames(store, next);
      setServerNames(next);
    },
    [serverNames, store],
  );

  return { serverNames, setServerName };
}
