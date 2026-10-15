"use client";

import { useState, type ReactNode, type SVGProps } from "react";
import type { Hostess } from "@/lib/hostessRows";
import type { SpecialNote } from "@/lib/specialNoteRows";
import type { SpecialNoteInput } from "@/lib/specialNotesStore";

interface SpecialNotesModalProps {
  notes: SpecialNote[];
  onAdd: (input: SpecialNoteInput) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  onSetNotifyAt: (id: number, notifyAt: string | null) => Promise<void>;
  hostesses: Hostess[];
  onAddHostess: (name: string) => Promise<void>;
  onUpdateHostess: (id: number, name: string) => Promise<void>;
  onRemoveHostess: (id: number) => Promise<void>;
  onClose: () => void;
}

const NOTE_MAX_LENGTH = 500;

// Small inline stroke icons (no icon package) - purely decorative labels
// for the form fields below, so each one reads at a glance rather than
// just by its text.
function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" strokeLinecap="round" />
    </svg>
  );
}

function NoteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M6 3.5h9l4 4V19a1.2 1.2 0 0 1-1.2 1.2H6A1.2 1.2 0 0 1 4.8 19V4.7A1.2 1.2 0 0 1 6 3.5Z" />
      <path d="M14.5 3.5V7a1 1 0 0 0 1 1h3.4M8.5 12h7M8.5 15.5h5" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.3 5.3 1.3 5.3H4.7S6 14.5 6 10.5Z" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

// Shared look for every text/date/select field in the form - a cream inset
// against the card's white surface, with a soft terracotta focus glow.
const FIELD_CLASSNAME =
  "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] shadow-sm transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/15";

function FieldLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
      <span className="text-[var(--color-accent)]">{icon}</span>
      {children}
    </span>
  );
}

function todayYYYYMMDD(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatNoteDate(noteDate: string): string {
  // noteDate is "YYYY-MM-DD" - parsed as local time (not UTC midnight) so
  // the displayed date always matches what was picked, regardless of the
  // viewer's timezone offset from UTC.
  const [year, month, day] = noteDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNotifyAt(notifyAt: string): string {
  return new Date(notifyAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Admin-only: logs a dated, 500-character note about an employee
// (behavior, praise, an incident - whatever needs a record). Restaurant-
// wide like the 86'd list, not tied to any table/reservation.
export function SpecialNotesModal({
  notes,
  onAdd,
  onRemove,
  onSetNotifyAt,
  hostesses,
  onAddHostess,
  onUpdateHostess,
  onRemoveHostess,
  onClose,
}: SpecialNotesModalProps) {
  const [noteDate, setNoteDate] = useState(todayYYYYMMDD);
  const [employeeName, setEmployeeName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingHostesses, setEditingHostesses] = useState(false);
  const [newHostessName, setNewHostessName] = useState("");
  const [hostessListError, setHostessListError] = useState<string | null>(null);
  const [schedulingNoteId, setSchedulingNoteId] = useState<number | null>(null);
  const [scheduleValue, setScheduleValue] = useState("");

  const counterNearLimit = note.length >= NOTE_MAX_LENGTH - 40;

  async function handleAdd() {
    if (!noteDate || !employeeName || !note.trim()) return;
    setError(null);
    try {
      await onAdd({ noteDate, employeeName, note: note.trim() });
      setEmployeeName("");
      setNote("");
      setNoteDate(todayYYYYMMDD());
    } catch {
      setError("Couldn't add this note — check your connection and try again.");
    }
  }

  async function handleRemove(id: number) {
    setError(null);
    try {
      await onRemove(id);
    } catch {
      setError("Couldn't remove this note — check your connection and try again.");
    }
  }

  function handleOpenScheduler(id: number) {
    setSchedulingNoteId(id);
    setScheduleValue("");
  }

  async function handleConfirmSchedule(id: number) {
    if (!scheduleValue) return;
    setError(null);
    try {
      await onSetNotifyAt(id, new Date(scheduleValue).toISOString());
      setSchedulingNoteId(null);
      setScheduleValue("");
    } catch {
      setError("Couldn't schedule this reminder — check your connection and try again.");
    }
  }

  async function handleCancelNotify(id: number) {
    setError(null);
    try {
      await onSetNotifyAt(id, null);
    } catch {
      setError("Couldn't cancel this reminder — check your connection and try again.");
    }
  }

  async function handleAddHostess() {
    const trimmed = newHostessName.trim();
    if (!trimmed) return;
    setHostessListError(null);
    try {
      await onAddHostess(trimmed);
      setNewHostessName("");
    } catch {
      setHostessListError("Couldn't add — check your connection and try again.");
    }
  }

  async function handleRenameHostess(hostess: Hostess, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === hostess.name) return;
    setHostessListError(null);
    try {
      await onUpdateHostess(hostess.id, trimmed);
    } catch {
      setHostessListError("Couldn't rename — check your connection and try again.");
    }
  }

  async function handleRemoveHostess(id: number) {
    setHostessListError(null);
    try {
      await onRemoveHostess(id);
    } catch {
      setHostessListError("Couldn't remove — check your connection and try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto bg-[var(--color-surface)] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-overdue-text)] text-white">
              <NoteIcon className="h-4.5 w-4.5" />
            </span>
            <h2 className="font-serif text-xl font-semibold text-[var(--color-text)]">Special Notes</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <label className="flex flex-col gap-1.5">
            <FieldLabel icon={<CalendarIcon className="h-4 w-4" />}>Date</FieldLabel>
            <input
              type="date"
              className={FIELD_CLASSNAME}
              value={noteDate}
              onChange={(event) => setNoteDate(event.target.value)}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel icon={<UserIcon className="h-4 w-4" />}>Employee name</FieldLabel>
              <button
                type="button"
                onClick={() => setEditingHostesses((current) => !current)}
                className="text-xs font-medium text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-accent-hover)]"
              >
                {editingHostesses ? "Done" : "Edit employee list"}
              </button>
            </div>

            {editingHostesses ? (
              <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm shadow-sm focus:border-[var(--color-accent)] focus:outline-none"
                    placeholder="New employee name"
                    value={newHostessName}
                    onChange={(event) => setNewHostessName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleAddHostess();
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddHostess}
                    className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-[var(--color-accent)] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
                  >
                    <PlusIcon className="h-3 w-3" />
                    Add
                  </button>
                </div>
                {hostesses.map((hostess) => (
                  <div key={hostess.id} className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm shadow-sm focus:border-[var(--color-accent)] focus:outline-none"
                      defaultValue={hostess.name}
                      onBlur={(event) => handleRenameHostess(hostess, event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveHostess(hostess.id)}
                      aria-label={`Remove ${hostess.name} from the employee list`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-overdue-bg)] hover:text-[var(--color-overdue-text)]"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <select
                className={`${FIELD_CLASSNAME} appearance-none bg-[image:none]`}
                value={employeeName}
                onChange={(event) => setEmployeeName(event.target.value)}
              >
                <option value="">Select employee…</option>
                {employeeName && !hostesses.some((hostess) => hostess.name === employeeName) && (
                  <option value={employeeName}>{employeeName} (custom)</option>
                )}
                {hostesses.map((hostess) => (
                  <option key={hostess.id} value={hostess.name}>
                    {hostess.name}
                  </option>
                ))}
              </select>
            )}
            {hostessListError && <p className="text-xs text-[var(--color-overdue-text)]">{hostessListError}</p>}
          </div>

          <label className="flex flex-col gap-1.5">
            <FieldLabel icon={<NoteIcon className="h-4 w-4" />}>Note</FieldLabel>
            <textarea
              className={`${FIELD_CLASSNAME} resize-none`}
              value={note}
              maxLength={NOTE_MAX_LENGTH}
              rows={4}
              placeholder="What happened, and what should the next person know?"
              onChange={(event) => setNote(event.target.value)}
            />
            <span
              className={`self-end rounded-full px-2 py-0.5 text-xs font-medium ${
                counterNearLimit
                  ? "bg-[var(--color-overdue-bg)] text-[var(--color-overdue-text)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              {note.length}/{NOTE_MAX_LENGTH}
            </span>
          </label>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!noteDate || !employeeName || !note.trim()}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <PlusIcon className="h-4 w-4" />
            Add note
          </button>
        </div>

        {error && <p className="text-sm text-[var(--color-overdue-text)]">{error}</p>}

        <div className="flex flex-col gap-3">
          {notes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
              No special notes yet.
            </p>
          ) : (
            notes.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] border-l-4 border-l-[var(--color-accent)] bg-[var(--color-surface)] p-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm">
                    <span className="font-semibold text-[var(--color-accent)]">{item.employeeName}</span>
                    <span className="text-[var(--color-text-muted)]"> · {formatNoteDate(item.noteDate)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    aria-label={`Remove note about ${item.employeeName} from ${formatNoteDate(item.noteDate)}`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-overdue-bg)] hover:text-[var(--color-overdue-text)]"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">{item.note}</p>

                {item.notifyAt ? (
                  <div className="flex items-center justify-between gap-2 rounded-md bg-[var(--color-bg)] px-2.5 py-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text)]">
                      <BellIcon className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                      {formatNotifyAt(item.notifyAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCancelNotify(item.id)}
                      className="text-xs font-medium text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-accent-hover)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : schedulingNoteId === item.id ? (
                  <div className="flex flex-col gap-1.5 rounded-md bg-[var(--color-bg)] p-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-[var(--color-text)]">
                        Select the date and Time
                      </span>
                      <input
                        type="datetime-local"
                        className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs shadow-sm focus:border-[var(--color-accent)] focus:outline-none"
                        value={scheduleValue}
                        onChange={(event) => setScheduleValue(event.target.value)}
                      />
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmSchedule(item.id)}
                        disabled={!scheduleValue}
                        className="whitespace-nowrap rounded-md bg-[var(--color-accent)] px-2.5 py-1 text-xs font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Schedule
                      </button>
                      <button
                        type="button"
                        onClick={() => setSchedulingNoteId(null)}
                        className="whitespace-nowrap px-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenScheduler(item.id)}
                    className="flex items-center gap-1.5 self-start text-xs font-medium text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-accent-hover)]"
                  >
                    <BellIcon className="h-3.5 w-3.5" />
                    Send notification
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
