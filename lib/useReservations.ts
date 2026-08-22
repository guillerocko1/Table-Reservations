"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeFinalTime,
  statusFor,
  summarizeStatuses,
  updateReservationFields,
  type Reservation,
  type ReservationInput,
  type ReservationStatus,
  type StatusSummary,
} from "./reservations";
import { ALL_TABLE_NUMBERS } from "./tables";
import { createMemoryStore, createReservationStore, isStoreAvailable, type ReservationStore } from "./store";

const POLL_INTERVAL_MS = 30_000;

export interface UseReservationsResult {
  reservationsByTable: Record<number, Reservation>;
  now: Date;
  isPersistent: boolean;
  getStatus: (tableNumber: number) => ReservationStatus;
  summary: StatusSummary;
  saveReservation: (tableNumber: number, input: ReservationInput) => void;
  seatTable: (tableNumber: number, startTime: string) => void;
  clearTable: (tableNumber: number) => void;
}

function getBrowserStore(): ReservationStore {
  if (typeof window !== "undefined" && isStoreAvailable(window.localStorage)) {
    return createReservationStore(window.localStorage);
  }
  return createReservationStore(createMemoryStore());
}

export function useReservations(): UseReservationsResult {
  const [store] = useState(getBrowserStore);
  const [reservationsByTable, setReservationsByTable] = useState<Record<number, Reservation>>({});
  // Starts true (the common case) so server and client agree on first
  // paint; the store's identity can differ between environments since it's
  // never rendered directly, but this flag IS rendered into JSX, so it must
  // start identical everywhere and only pick up its real value post-mount.
  const [isPersistent, setIsPersistent] = useState(true);
  const [now, setNow] = useState(new Date());

  // Load whatever was already saved once the component mounts on the
  // client (server-rendered output always starts empty, so this can't
  // cause a hydration mismatch).
  useEffect(() => {
    setReservationsByTable(store.getAll());
    setIsPersistent(typeof window !== "undefined" && isStoreAvailable(window.localStorage));
  }, [store]);

  // Re-derive statuses periodically so an Occupied table flips to Overdue
  // live, without the employee needing to refresh the page.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // store.save/store.clear are called here, in the event handler itself,
  // rather than inside the setReservationsByTable updater below — updater
  // functions run during React's render phase and aren't guaranteed to run
  // exactly once (Strict Mode double-invokes them), so side effects like
  // localStorage writes don't belong there.
  const saveReservation = useCallback(
    (tableNumber: number, input: ReservationInput) => {
      const existing = reservationsByTable[tableNumber];
      const reservation = updateReservationFields(existing, tableNumber, input);
      store.save(reservation);
      setReservationsByTable((current) => ({ ...current, [tableNumber]: reservation }));
    },
    [reservationsByTable, store],
  );

  const seatTable = useCallback(
    (tableNumber: number, startTime: string) => {
      const existing = reservationsByTable[tableNumber];
      if (!existing) return;
      const updated: Reservation = {
        ...existing,
        startTime,
        finalTime: computeFinalTime(startTime, existing.timeLimitMinutes),
      };
      store.save(updated);
      setReservationsByTable((current) => ({ ...current, [tableNumber]: updated }));
    },
    [reservationsByTable, store],
  );

  const clearTable = useCallback(
    (tableNumber: number) => {
      store.clear(tableNumber);
      setReservationsByTable((current) => {
        const next = { ...current };
        delete next[tableNumber];
        return next;
      });
    },
    [store],
  );

  const summary = useMemo(
    () => summarizeStatuses(reservationsByTable, ALL_TABLE_NUMBERS, now),
    [reservationsByTable, now],
  );

  return {
    reservationsByTable,
    now,
    isPersistent,
    getStatus: (tableNumber: number) => statusFor(reservationsByTable[tableNumber], now),
    summary,
    saveReservation,
    seatTable,
    clearTable,
  };
}
