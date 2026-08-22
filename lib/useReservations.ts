"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeFinalTime,
  statusFor,
  summarizeStatuses,
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

  const saveReservation = useCallback(
    (tableNumber: number, input: ReservationInput) => {
      setReservationsByTable((current) => {
        const existing = current[tableNumber];
        const reservation: Reservation = {
          tableNumber,
          guestName: input.guestName,
          partySize: input.partySize,
          celebration: input.celebration,
          allergies: input.allergies,
          reservationTime: input.reservationTime,
          timeLimitMinutes: input.timeLimitMinutes,
          startTime: existing?.startTime ?? null,
          finalTime: existing?.finalTime ?? null,
        };
        store.save(reservation);
        return { ...current, [tableNumber]: reservation };
      });
    },
    [store],
  );

  const seatTable = useCallback(
    (tableNumber: number, startTime: string) => {
      setReservationsByTable((current) => {
        const existing = current[tableNumber];
        if (!existing) return current;
        const updated: Reservation = {
          ...existing,
          startTime,
          finalTime: computeFinalTime(startTime, existing.timeLimitMinutes),
        };
        store.save(updated);
        return { ...current, [tableNumber]: updated };
      });
    },
    [store],
  );

  const clearTable = useCallback(
    (tableNumber: number) => {
      setReservationsByTable((current) => {
        const next = { ...current };
        delete next[tableNumber];
        store.clear(tableNumber);
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
