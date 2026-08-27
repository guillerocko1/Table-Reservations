"use client";

import { useState } from "react";
import Link from "next/link";
import { useReservations } from "@/lib/useReservations";
import { StatusSummary } from "@/components/StatusSummary";
import { FloorPlan } from "@/components/FloorPlan";
import { ReservationDetails } from "@/components/ReservationDetails";

// Read-only mirror of the admin page ("/"): same live data via the same
// hook, same floor plan, but selecting a table opens ReservationDetails
// instead of ReservationPanel - no add/edit/seat/clear controls anywhere
// on this page.
export default function StaffView() {
  const { reservationsByTable, isLoading, isConnected, loadError, getStatus, summary, now, retry } =
    useReservations();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">Elena&apos;s Restaurant - West Portal</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Staff view — click a table to see its details</p>
          {!isLoading && !loadError && !isConnected && (
            <p className="mt-2 rounded-md bg-[var(--color-overdue-bg)] px-3 py-2 text-sm text-[var(--color-overdue-text)]">
              Reconnecting to the shared reservation data &mdash; this view may be stale until it
              comes back.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
          <Link href="/" className="whitespace-nowrap font-medium text-[var(--color-accent)] underline">
            Admin view →
          </Link>
          <Link href="/by-server" className="whitespace-nowrap font-medium text-[var(--color-accent)] underline">
            By server →
          </Link>
        </div>
      </header>

      {loadError ? (
        <div className="rounded-md border border-[var(--color-overdue-border)] bg-[var(--color-overdue-bg)] p-4 text-[var(--color-overdue-text)]">
          <p className="font-medium">Couldn&apos;t load reservations: {loadError}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded-md border border-current px-3 py-1.5 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading reservations…</p>
      ) : (
        <>
          <StatusSummary summary={summary} />

          <FloorPlan
            reservationsByTable={reservationsByTable}
            getStatus={getStatus}
            now={now}
            onSelectTable={setSelectedTable}
          />

          <ReservationDetails
            tableNumber={selectedTable}
            reservation={selectedTable !== null ? reservationsByTable[selectedTable] : undefined}
            status={selectedTable !== null ? getStatus(selectedTable) : "available"}
            now={now}
            onClose={() => setSelectedTable(null)}
          />
        </>
      )}
    </main>
  );
}
