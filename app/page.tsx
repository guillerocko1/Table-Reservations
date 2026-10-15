"use client";

import { useState } from "react";
import Image from "next/image";
import { useReservations } from "@/lib/useReservations";
import { useServerRoster } from "@/lib/useServerRoster";
import { useEightySixedItems } from "@/lib/useEightySixedItems";
import { useSpecialNotes } from "@/lib/useSpecialNotes";
import { useEmployees } from "@/lib/useEmployees";
import { useHostesses } from "@/lib/useHostesses";
import { StatusSummary } from "@/components/StatusSummary";
import { FloorPlan } from "@/components/FloorPlan";
import { ReservationPanel } from "@/components/ReservationPanel";
import { EightySixBanner } from "@/components/EightySixBanner";
import { EightySixManager } from "@/components/EightySixManager";
import { SpecialNotesModal } from "@/components/SpecialNotesModal";
import { NoteReminderPopup } from "@/components/NoteReminderPopup";
import { NAV_BAR_CLASSNAME, NavLinkButton, navButtonClassName } from "@/components/NavLinkButton";

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
    clearTable,
    retry,
  } = useReservations();
  const { serverNames, setServerName } = useServerRoster();
  const { items: eightySixedItems, addItem: addEightySixedItem, removeItem: removeEightySixedItem } =
    useEightySixedItems();
  const {
    notes: specialNotes,
    addNote: addSpecialNote,
    removeNote: removeSpecialNote,
    setNotifyAt,
  } = useSpecialNotes();
  const { employees, addEmployee, updateEmployee, removeEmployee } = useEmployees();
  const { hostesses, addHostess, updateHostess, removeHostess } = useHostesses();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [isSpecialNotesOpen, setIsSpecialNotesOpen] = useState(false);

  // At most one shown at a time - once dismissed (notifyAt cleared), the
  // next-due note (if any) takes its place on the following render.
  const dueNote = specialNotes.find((note) => note.notifyAt && new Date(note.notifyAt) <= now);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/elenas-logo.png" alt="Elena's Restaurant logo" width={80} height={64} />
          <div>
            <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">Elena&apos;s Restaurant - West Portal</h1>
            <EightySixBanner items={eightySixedItems} />
            <p className="text-sm text-[var(--color-text-muted)]">Bar and main dining floor plan</p>
            {!isLoading && !loadError && !isConnected && (
              <p className="mt-2 rounded-md bg-[var(--color-overdue-bg)] px-3 py-2 text-sm text-[var(--color-overdue-text)]">
                Reconnecting to the shared reservation data &mdash; changes from other devices may not
                appear until this comes back.
              </p>
            )}
          </div>
        </div>
        <nav className={NAV_BAR_CLASSNAME}>
          <button type="button" onClick={() => setIsSpecialNotesOpen(true)} className={navButtonClassName}>
            Special Notes
          </button>
          <NavLinkButton href="/staff">
            View as Staff
          </NavLinkButton>
          <NavLinkButton href="/by-server">
            By server
          </NavLinkButton>
        </nav>
      </header>

      <EightySixManager items={eightySixedItems} onAdd={addEightySixedItem} onRemove={removeEightySixedItem} />

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
            serverNames={serverNames}
          />

          <ReservationPanel
            tableNumber={selectedTable}
            reservation={selectedTable !== null ? reservationsByTable[selectedTable] : undefined}
            serverNames={serverNames}
            employees={employees}
            onSetServerName={setServerName}
            onAddEmployee={addEmployee}
            onUpdateEmployee={updateEmployee}
            onRemoveEmployee={removeEmployee}
            onSave={(tableNumber, input) => saveReservation(tableNumber, input)}
            onClear={async (tableNumber) => {
              await clearTable(tableNumber);
              setSelectedTable(null);
            }}
            onClose={() => setSelectedTable(null)}
          />
        </>
      )}

      {isSpecialNotesOpen && (
        <SpecialNotesModal
          notes={specialNotes}
          onAdd={addSpecialNote}
          onRemove={removeSpecialNote}
          onSetNotifyAt={setNotifyAt}
          hostesses={hostesses}
          onAddHostess={addHostess}
          onUpdateHostess={updateHostess}
          onRemoveHostess={removeHostess}
          onClose={() => setIsSpecialNotesOpen(false)}
        />
      )}

      {dueNote && <NoteReminderPopup note={dueNote} onDismiss={() => setNotifyAt(dueNote.id, null)} />}
    </main>
  );
}
