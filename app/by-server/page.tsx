"use client";

import Link from "next/link";
import { groupReservationsByServer } from "@/lib/reservations";
import { useReservations } from "@/lib/useReservations";
import { useServerRoster } from "@/lib/useServerRoster";
import { ServerTableCard } from "@/components/ServerTableCard";

// Read-only, shared by admin and staff alike (same live data, no editing
// controls) — a different grouping of the same floor plan data, by server
// instead of by seating zone.
export default function ByServerView() {
  const { reservationsByTable, isLoading, isConnected, loadError, now, retry } = useReservations();
  const { serverNames } = useServerRoster();

  const groups = groupReservationsByServer(reservationsByTable, serverNames);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">Elena&apos;s Restaurant - West Portal</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Tables grouped by server</p>
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
          <Link href="/staff" className="whitespace-nowrap font-medium text-[var(--color-accent)] underline">
            Staff view →
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
      ) : groups.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No tables currently have a server assigned.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.serverName} className="flex flex-col gap-3">
              <h2 className="font-serif text-xl font-semibold text-blue-900">
                {group.serverName}{" "}
                <span className="text-sm font-normal text-[var(--color-text-muted)]">
                  ({group.reservations.length} table{group.reservations.length === 1 ? "" : "s"})
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.reservations.map((reservation) => (
                  <ServerTableCard
                    key={reservation.tableNumber}
                    reservation={reservation}
                    now={now}
                    serverNames={serverNames}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
