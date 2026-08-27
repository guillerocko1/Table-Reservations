"use client";

import { useState } from "react";
import Link from "next/link";
import { useReservations } from "@/lib/useReservations";
import { useServerRoster } from "@/lib/useServerRoster";
import { StatusSummary } from "@/components/StatusSummary";
import { FloorPlan } from "@/components/FloorPlan";
import { ReservationPanel } from "@/components/ReservationPanel";

export default function Home() {
  const {
    reservationsByTable,
    isLoading,
    isConnected,
    loadError,
    getStatus,
    summary,
    now,
    saveReservation,
    seatTable,
    clearTable,
    retry,
  } = useReservations();
  const { serverNames, setServerName } = useServerRoster();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">Elena&apos;s Restaurant - West Portal</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Bar and main dining floor plan</p>
          {!isLoading && !loadError && !isConnected && (
            <p className="mt-2 rounded-md bg-[var(--color-overdue-bg)] px-3 py-2 text-sm text-[var(--color-overdue-text)]">
              Reconnecting to the shared reservation data &mdash; changes from other devices may not
              appear until this comes back.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
          <Link href="/staff" className="whitespace-nowrap font-medium text-[var(--color-accent)] underline">
            View as staff →
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

          <ReservationPanel
            tableNumber={selectedTable}
            reservation={selectedTable !== null ? reservationsByTable[selectedTable] : undefined}
            serverNames={serverNames}
            onSetServerName={setServerName}
            onSave={(tableNumber, input) => saveReservation(tableNumber, input)}
            onSeat={(tableNumber, startTime) => seatTable(tableNumber, startTime)}
            onClear={async (tableNumber) => {
              await clearTable(tableNumber);
              setSelectedTable(null);
            }}
            onClose={() => setSelectedTable(null)}
          />
        </>
      )}
    </main>
  );
}
