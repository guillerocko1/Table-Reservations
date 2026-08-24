"use client";

import { useState } from "react";
import Link from "next/link";
import { useReservations } from "@/lib/useReservations";
import { useServerRoster } from "@/lib/useServerRoster";
import { StatusSummary } from "@/components/StatusSummary";
import { FloorPlan } from "@/components/FloorPlan";
import { ReservationPanel } from "@/components/ReservationPanel";

export default function Home() {
  const { reservationsByTable, isPersistent, getStatus, summary, now, saveReservation, seatTable, clearTable } =
    useReservations();
  const { serverNames, setServerName } = useServerRoster();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">Table Reservations</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Bar and main dining floor plan</p>
          {!isPersistent && (
            <p className="mt-2 rounded-md bg-[var(--color-overdue-bg)] px-3 py-2 text-sm text-[var(--color-overdue-text)]">
              Your browser isn&apos;t saving changes between visits (private browsing?). Changes will be lost
              when you close this tab.
            </p>
          )}
        </div>
        <Link
          href="/staff"
          className="whitespace-nowrap text-sm font-medium text-[var(--color-accent)] underline"
        >
          View as staff →
        </Link>
      </header>

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
        onClear={(tableNumber) => {
          clearTable(tableNumber);
          setSelectedTable(null);
        }}
        onClose={() => setSelectedTable(null)}
      />
    </main>
  );
}
