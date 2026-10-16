"use client";

import { useState } from "react";
import type { SpecialNote } from "@/lib/specialNoteRows";

interface SpecialNotesBoardProps {
  notes: SpecialNote[];
  onRemove: (id: number) => Promise<void>;
  /** Rendered in the narrow right-side column next to the floor plan (see
   *  app/page.tsx) - a single column instead of the responsive grid, which
   *  sizes columns off the viewport width, not this component's own
   *  (narrow) container width, and would otherwise try to go 2-3 wide
   *  regardless of how little space it actually has. */
  narrow?: boolean;
}

function formatNoteDate(noteDate: string): string {
  // noteDate is "YYYY-MM-DD" - parsed as local time (not UTC midnight) so
  // the displayed date always matches what was picked, regardless of the
  // viewer's timezone offset from UTC.
  const [year, month, day] = noteDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// The note's own date has no time of day - the timestamp shown alongside
// it is the notification's own time, not when the note was typed in:
// notifyAt (still pending - "will be displayed at") if set, else
// notifiedAt (already fired - "was displayed at") if set, else nothing
// (a note with no reminder ever scheduled has no time to show).
function notificationTimestamp(note: SpecialNote): string | null {
  if (note.notifyAt) return formatDateTime(note.notifyAt);
  if (note.notifiedAt) return formatDateTime(note.notifiedAt);
  return null;
}

// Read-only (except for delete) summary of every Special Note. Renders as
// either a full-width grid or a narrow single column (see the `narrow`
// prop) depending on where app/page.tsx places it.
// notifiedAt (not notifyAt) drives the Done/Pending label: it's set once,
// permanently, the first time a note's reminder actually fires - a note
// with no reminder ever scheduled is "Pending" too, same as one scheduled
// for later but not yet due.
export function SpecialNotesBoard({ notes, onRemove, narrow }: SpecialNotesBoardProps) {
  const [error, setError] = useState<string | null>(null);

  if (notes.length === 0) return null;

  async function handleRemove(id: number) {
    setError(null);
    try {
      await onRemove(id);
    } catch {
      setError("Couldn't remove this note — check your connection and try again.");
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-lg font-semibold text-[var(--color-text)]">Special Notes</h2>
      {error && <p className="text-sm text-[var(--color-overdue-text)]">{error}</p>}
      <div className={narrow ? "flex flex-col gap-3" : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
        {notes.map((note) => {
          const done = Boolean(note.notifiedAt);
          const timestamp = notificationTimestamp(note);
          return (
            <div
              key={note.id}
              className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-border)] border-l-4 border-l-[var(--color-accent)] bg-[var(--color-surface)] p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm">
                  <span className="font-semibold text-[var(--color-accent)]">{note.employeeName}</span>
                  <span className="text-[var(--color-text-muted)]">
                    {" "}
                    · {formatNoteDate(note.noteDate)}
                    {timestamp && ` · ${timestamp}`}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
                      done
                        ? "bg-[var(--color-overdue-bg)] text-[var(--color-overdue-text)]"
                        : "bg-[var(--color-available-bg)] text-[var(--color-available-text)]"
                    }`}
                  >
                    {done ? "Done" : "Pending"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(note.id)}
                    aria-label={`Remove note about ${note.employeeName} from ${formatNoteDate(note.noteDate)}`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-overdue-bg)] hover:text-[var(--color-overdue-text)]"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">{note.note}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
