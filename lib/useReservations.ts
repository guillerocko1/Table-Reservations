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
import {
  deleteReservation,
  fetchAllReservations,
  subscribeToReservations,
  upsertReservation,
} from "./reservationsStore";

const POLL_INTERVAL_MS = 30_000;

export interface UseReservationsResult {
  reservationsByTable: Record<number, Reservation>;
  now: Date;
  isLoading: boolean;
  isConnected: boolean;
  loadError: string | null;
  getStatus: (tableNumber: number) => ReservationStatus;
  summary: StatusSummary;
  saveReservation: (tableNumber: number, input: ReservationInput) => Promise<void>;
  seatTable: (tableNumber: number, startTime: string) => Promise<void>;
  clearTable: (tableNumber: number) => Promise<void>;
  retry: () => void;
}

export function useReservations(): UseReservationsResult {
  const [reservationsByTable, setReservationsByTable] = useState<Record<number, Reservation>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [retryToken, setRetryToken] = useState(0);

  // Initial fetch + realtime subscription for this hook's lifetime. Reruns
  // on retry() (a failed initial load) but never on its own after that -
  // subsequent updates arrive via the realtime subscription, not a refetch
  // of this effect.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    fetchAllReservations()
      .then((byTable) => {
        if (!cancelled) {
          setReservationsByTable(byTable);
          setIsLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load reservations.");
          setIsLoading(false);
        }
      });

    const unsubscribe = subscribeToReservations(
      (byTable) => {
        if (!cancelled) setReservationsByTable(byTable);
      },
      (status) => {
        if (!cancelled) setIsConnected(status === "connected");
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [retryToken]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Each mutation applies its change to local state immediately (so the
  // initiating device feels instant) and rolls back if the Supabase write
  // fails - the caller (ReservationPanel) catches the rethrown error to
  // show an inline message.
  const saveReservation = useCallback(
    async (tableNumber: number, input: ReservationInput) => {
      const existing = reservationsByTable[tableNumber];
      const reservation = updateReservationFields(existing, tableNumber, input);
      setReservationsByTable((current) => ({ ...current, [tableNumber]: reservation }));
      try {
        await upsertReservation(reservation);
      } catch (error) {
        setReservationsByTable((current) => {
          const next = { ...current };
          if (existing) {
            next[tableNumber] = existing;
          } else {
            delete next[tableNumber];
          }
          return next;
        });
        throw error;
      }
    },
    [reservationsByTable],
  );

  const seatTable = useCallback(
    async (tableNumber: number, startTime: string) => {
      const existing = reservationsByTable[tableNumber];
      if (!existing) return;
      const updated: Reservation = {
        ...existing,
        startTime,
        finalTime: computeFinalTime(startTime, existing.timeLimitMinutes),
      };
      setReservationsByTable((current) => ({ ...current, [tableNumber]: updated }));
      try {
        await upsertReservation(updated);
      } catch (error) {
        setReservationsByTable((current) => ({ ...current, [tableNumber]: existing }));
        throw error;
      }
    },
    [reservationsByTable],
  );

  const clearTable = useCallback(
    async (tableNumber: number) => {
      const existing = reservationsByTable[tableNumber];
      setReservationsByTable((current) => {
        const next = { ...current };
        delete next[tableNumber];
        return next;
      });
      try {
        await deleteReservation(tableNumber);
      } catch (error) {
        if (existing) {
          setReservationsByTable((current) => ({ ...current, [tableNumber]: existing }));
        }
        throw error;
      }
    },
    [reservationsByTable],
  );

  const retry = useCallback(() => setRetryToken((token) => token + 1), []);

  const summary = useMemo(
    () => summarizeStatuses(reservationsByTable, ALL_TABLE_NUMBERS, now),
    [reservationsByTable, now],
  );

  return {
    reservationsByTable,
    now,
    isLoading,
    isConnected,
    loadError,
    getStatus: (tableNumber: number) => statusFor(reservationsByTable[tableNumber], now),
    summary,
    saveReservation,
    seatTable,
    clearTable,
    retry,
  };
}
