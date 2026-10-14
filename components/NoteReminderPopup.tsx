import type { SpecialNote } from "@/lib/specialNoteRows";

interface NoteReminderPopupProps {
  note: SpecialNote;
  onDismiss: () => Promise<void>;
}

// Centered (not a slide-over, unlike every other panel in this app) and
// above everything else (z-30, one above ReservationPanel/SpecialNotesModal's
// z-20) - a scheduled reminder firing while an admin is mid-task elsewhere
// on the page needs to interrupt, not queue behind whatever's already open.
export function NoteReminderPopup({ note, onDismiss }: NoteReminderPopupProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-6">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl bg-[var(--color-surface)] p-6 text-center shadow-xl">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Note reminder
        </p>
        <p className="text-2xl font-bold text-[var(--color-overdue-text)]">{note.employeeName}</p>
        <p className="whitespace-pre-wrap text-xl font-semibold text-[var(--color-text)]">{note.note}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 self-center rounded-md bg-[var(--color-accent)] px-4 py-2 font-medium text-white hover:bg-[var(--color-accent-hover)]"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
