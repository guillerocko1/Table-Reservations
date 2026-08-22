"use client";

import { useState } from "react";
import Link from "next/link";
import { useReservations } from "@/lib/useReservations";
import { StatusSummary } from "@/components/StatusSummary";
import { FloorPlan } from "@/components/FloorPlan";
import { ReservationDetails } from "@/components/ReservationDetails";

// Read-only mirror of the admin page ("/"): same live data via the same
// hook, same floor plan, but selecting a table opens ReservationDetails
// instead of ReservationPanel — no add/edit/seat/clear controls anywhere
// on this page.
export default function StaffView() {
  const { reservationsByTable, isPersistent, getStatus, summary, now } = useReservations();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">Table Reservations</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Staff view — click a table to see its details</p>
          {!isPersistent && (
            <p className="mt-2 rounded-md bg-[var(--color-overdue-bg)] px-3 py-2 text-sm text-[var(--color-overdue-text)]">
              This browser isn&apos;t saving changes between visits (private browsing?).
            </p>
          )}
        </div>
        <Link
          href="/"
          className="whitespace-nowrap text-sm font-medium text-[var(--color-accent)] underline"
        >
          Admin view →
        </Link>
      </header>

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
    </main>
  );
}
