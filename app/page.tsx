"use client";

import { useState } from "react";
import { StatusSummary } from "@/components/StatusSummary";
import { FloorPlan } from "@/components/FloorPlan";
import { ALL_TABLE_NUMBERS } from "@/lib/tables";
import { summarizeStatuses, type Reservation, type ReservationStatus } from "@/lib/reservations";

export default function Home() {
  const [reservationsByTable] = useState<Record<number, Reservation>>({});
  const now = new Date();

  function getStatus(tableNumber: number): ReservationStatus {
    return reservationsByTable[tableNumber] ? "reserved" : "available";
  }

  const summary = summarizeStatuses(reservationsByTable, ALL_TABLE_NUMBERS, now);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">Table Reservations</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Bar and main dining floor plan</p>
      </header>
      <StatusSummary summary={summary} />
      <FloorPlan
        reservationsByTable={reservationsByTable}
        getStatus={getStatus}
        onSelectTable={() => {}}
      />
    </main>
  );
}
