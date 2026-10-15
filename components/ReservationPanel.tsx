"use client";

import { useEffect, useState } from "react";
import {
  validateReservationInput,
  formatHHmm,
  formatTime12Hour,
  GUEST_TAGS,
  type Celebration,
  type GuestTag,
  type Reservation,
  type ReservationInput,
  type TimeLimitMinutes,
} from "@/lib/reservations";
import type { Employee } from "@/lib/employeeRows";

interface ReservationPanelProps {
  tableNumber: number | null;
  reservation: Reservation | undefined;
  serverNames: string[];
  employees: Employee[];
  onSetServerName: (index: number, name: string) => Promise<void>;
  onAddEmployee: (name: string) => Promise<void>;
  onUpdateEmployee: (id: number, name: string) => Promise<void>;
  onRemoveEmployee: (id: number) => Promise<void>;
  onSave: (tableNumber: number, input: ReservationInput) => Promise<void>;
  onClear: (tableNumber: number) => Promise<void>;
  onClose: () => void;
}

const CELEBRATIONS: Celebration[] = ["None", "Birthday", "Anniversary", "Engagement", "Other"];
const TIME_LIMITS: TimeLimitMinutes[] = [30, 45, 60, 75, 90, 105, 120, 135];
const TIME_LIMIT_LABELS: Record<TimeLimitMinutes, string> = {
  30: "30 minutes",
  45: "45 minutes",
  60: "1 hour",
  75: "1 h 15 minutes",
  90: "1 h 30 minutes",
  105: "1 h 45 minutes",
  120: "2 hours",
  135: "2 h 15 minutes",
};

// Party size dropdown choices — anything larger switches to a plain number
// input instead (see the "More than 15…" option below).
const PARTY_SIZE_OPTIONS = Array.from({ length: 15 }, (_, index) => index + 1);

// "HH:mm" for right now — a brand-new reservation's booked time defaults
// to the moment the admin is actually working in, rather than an
// arbitrary fixed time.
function nowHHmm(): string {
  return formatHHmm(new Date());
}

function emptyInput(): ReservationInput {
  return {
    guestName: "",
    tags: [],
    partySize: 2,
    celebration: "None",
    allergies: "",
    reservationTime: nowHHmm(),
    timeLimitMinutes: 90,
    serverName: "",
  };
}

export function ReservationPanel({
  tableNumber,
  reservation,
  serverNames,
  employees,
  onSetServerName,
  onAddEmployee,
  onUpdateEmployee,
  onRemoveEmployee,
  onSave,
  onClear,
  onClose,
}: ReservationPanelProps) {
  const [input, setInput] = useState<ReservationInput>(emptyInput);
  const [errors, setErrors] = useState<ReturnType<typeof validateReservationInput>["errors"]>({});
  const [editingServerList, setEditingServerList] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftServerNames, setDraftServerNames] = useState<string[]>(serverNames);
  const [serverNameError, setServerNameError] = useState<string | null>(null);
  const [newKnownServerName, setNewKnownServerName] = useState("");
  const [knownServerListError, setKnownServerListError] = useState<string | null>(null);
  // Whether the party size field shows the 1-15 dropdown or a free-typed
  // number — starts in dropdown mode unless the loaded reservation already
  // has a bigger party, so a large existing reservation's real size is
  // visible right away instead of showing a dropdown value that doesn't
  // match it.
  const [customPartySize, setCustomPartySize] = useState(false);

  useEffect(() => {
    if (reservation) {
      setInput({
        guestName: reservation.guestName,
        tags: reservation.tags,
        partySize: reservation.partySize,
        celebration: reservation.celebration,
        allergies: reservation.allergies,
        reservationTime: reservation.reservationTime,
        timeLimitMinutes: reservation.timeLimitMinutes,
        serverName: reservation.serverName,
      });
      setCustomPartySize(reservation.partySize > 15);
    } else {
      setInput(emptyInput());
      setCustomPartySize(false);
    }
    setErrors({});
    setSaveError(null);
    // Deliberately depends on tableNumber only, not on `reservation` itself.
    // `reservation` gets a brand-new object identity on every realtime
    // change to ANY table (the whole floor's data is refetched on each
    // change — see lib/reservationsStore.ts's subscribeToReservations),
    // not just this one. Depending on it here would re-run this reset
    // whenever an unrelated device saves a different table, wiping
    // whatever the user is currently typing, and would also wipe the
    // just-shown save/seat/clear error the moment the optimistic update
    // that triggered it rolls back on failure. Reading `reservation` fresh
    // inside the effect body is safe: this component re-renders (recreating
    // this effect's closure) whenever tableNumber changes, since the parent
    // always updates both props together on a genuine table switch.
  }, [tableNumber]);

  // Reload the draft from the live roster only when entering edit mode, not
  // on every remote change while already editing — same "don't clobber
  // in-progress typing" reasoning as the effect above.
  useEffect(() => {
    if (editingServerList) {
      setDraftServerNames(serverNames);
    }
  }, [editingServerList]);

  if (tableNumber === null) return null;

  // One button does both jobs: saving a table that isn't seated yet also
  // seats it as of right now (see updateReservationFields's seatAt
  // parameter) — editing an already-seated table's details just saves,
  // since it already has a startTime that seatAt won't override.
  async function handleSave() {
    const result = validateReservationInput(input);
    setErrors(result.errors);
    if (!result.valid) return;
    setSaveError(null);
    try {
      await onSave(tableNumber as number, input);
    } catch {
      setSaveError(
        reservation?.startTime
          ? "Couldn't save — check your connection and try again."
          : "Couldn't seat this table — check your connection and try again.",
      );
    }
  }

  async function handleClear() {
    setSaveError(null);
    try {
      await onClear(tableNumber as number);
    } catch {
      setSaveError("Couldn't clear this table — check your connection and try again.");
    }
  }

  async function handleServerNameCommit(index: number, name: string) {
    if (name === serverNames[index]) return;
    setServerNameError(null);
    try {
      await onSetServerName(index, name);
    } catch {
      setServerNameError("Couldn't update the server list — check your connection and try again.");
    }
  }

  async function handleAddKnownServer() {
    const trimmed = newKnownServerName.trim();
    if (!trimmed) return;
    setKnownServerListError(null);
    try {
      await onAddEmployee(trimmed);
      setNewKnownServerName("");
    } catch {
      setKnownServerListError("Couldn't add — check your connection and try again.");
    }
  }

  async function handleRenameKnownServer(employee: Employee, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === employee.name) return;
    setKnownServerListError(null);
    try {
      await onUpdateEmployee(employee.id, trimmed);
    } catch {
      setKnownServerListError("Couldn't rename — check your connection and try again.");
    }
  }

  async function handleRemoveKnownServer(id: number) {
    setKnownServerListError(null);
    try {
      await onRemoveEmployee(id);
    } catch {
      setKnownServerListError("Couldn't remove — check your connection and try again.");
    }
  }

  function toggleTag(tag: GuestTag) {
    setInput((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags.filter((t) => t !== tag) : [...current.tags, tag],
    }));
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-sm flex-col gap-4 overflow-y-auto bg-[var(--color-surface)] p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-[var(--color-text)]">Table {tableNumber}</h2>
          <button type="button" onClick={onClose} className="text-sm text-[var(--color-text-muted)]">
            Close
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Guest name
          <input
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            value={input.guestName}
            onChange={(event) => setInput({ ...input, guestName: event.target.value })}
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm">
          Guest tags
          <div className="flex flex-wrap gap-1.5">
            {GUEST_TAGS.map((tag) => {
              const active = input.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={active}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Party size
          {customPartySize ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
                value={input.partySize}
                onChange={(event) => setInput({ ...input, partySize: Number(event.target.value) })}
              />
              <button
                type="button"
                onClick={() => setCustomPartySize(false)}
                className="whitespace-nowrap text-xs font-medium text-[var(--color-accent)] underline"
              >
                Choose from list
              </button>
            </div>
          ) : (
            <select
              className="rounded-md border border-[var(--color-border)] px-3 py-2"
              value={input.partySize}
              onChange={(event) => {
                if (event.target.value === "custom") {
                  setCustomPartySize(true);
                  return;
                }
                setInput({ ...input, partySize: Number(event.target.value) });
              }}
            >
              {PARTY_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
              <option value="custom">More than 15…</option>
            </select>
          )}
          {errors.partySize && <span className="text-xs text-[var(--color-overdue-text)]">{errors.partySize}</span>}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Special celebration
          <select
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            value={input.celebration}
            onChange={(event) => setInput({ ...input, celebration: event.target.value as Celebration })}
          >
            {CELEBRATIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Visit Notes
          <textarea
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            value={input.allergies}
            onChange={(event) => setInput({ ...input, allergies: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Time limit
          <select
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            value={input.timeLimitMinutes}
            onChange={(event) =>
              setInput({ ...input, timeLimitMinutes: Number(event.target.value) as TimeLimitMinutes })
            }
          >
            {TIME_LIMITS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {TIME_LIMIT_LABELS[minutes]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span>Server name</span>
            <button
              type="button"
              onClick={() => setEditingServerList((current) => !current)}
              className="text-xs font-medium text-[var(--color-accent)] underline"
            >
              {editingServerList ? "Done" : "Edit server list"}
            </button>
          </div>

          {editingServerList ? (
            <div className="flex flex-col gap-3 rounded-md border border-[var(--color-border)] p-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-text-muted)]">Known servers</span>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                    placeholder="New server name"
                    value={newKnownServerName}
                    onChange={(event) => setNewKnownServerName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleAddKnownServer();
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddKnownServer}
                    className="whitespace-nowrap rounded-md bg-[var(--color-accent)] px-2 py-1 text-xs font-medium text-white"
                  >
                    Add
                  </button>
                </div>
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                      defaultValue={employee.name}
                      onBlur={(event) => handleRenameKnownServer(employee, event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveKnownServer(employee.id)}
                      aria-label={`Remove ${employee.name} from the known servers list`}
                      className="shrink-0 text-[var(--color-text-muted)]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {knownServerListError && (
                  <p className="text-xs text-[var(--color-overdue-text)]">{knownServerListError}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 border-t border-[var(--color-border)] pt-2">
                <span className="text-xs font-semibold text-[var(--color-text-muted)]">Today's roster</span>
                {draftServerNames.map((name, index) => (
                  <select
                    key={index}
                    className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                    value={name}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDraftServerNames((current) => {
                        const next = [...current];
                        next[index] = value;
                        return next;
                      });
                      handleServerNameCommit(index, value);
                    }}
                  >
                    <option value="">— empty —</option>
                    {/* Keeps a slot's existing name selectable even if it isn't
                        on the known-names list (typo'd or since renamed),
                        instead of silently dropping it when this became a
                        dropdown. */}
                    {name !== "" && !employees.some((employee) => employee.name === name) && (
                      <option value={name}>{name} (custom)</option>
                    )}
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.name}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </div>
          ) : (
            <select
              className="rounded-md border border-[var(--color-border)] px-3 py-2 text-lg font-semibold text-[var(--color-accent)]"
              value={input.serverName}
              onChange={(event) => setInput({ ...input, serverName: event.target.value })}
            >
              <option value="">Unassigned</option>
              {/* Keeps a reservation's existing server visible even if it was
                  typed before the roster existed, or no longer matches a
                  current slot (e.g. the slot was renamed). */}
              {input.serverName && !serverNames.includes(input.serverName) && (
                <option value={input.serverName}>{input.serverName} (custom)</option>
              )}
              {serverNames.map(
                (name, index) =>
                  name.trim() !== "" && (
                    <option key={index} value={name}>
                      {name}
                    </option>
                  ),
              )}
            </select>
          )}
          {serverNameError && <p className="text-xs text-[var(--color-overdue-text)]">{serverNameError}</p>}
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 font-medium text-white hover:bg-[var(--color-accent-hover)]"
        >
          {reservation?.startTime ? "Save changes" : "Seat now"}
        </button>

        {saveError && <p className="text-sm text-[var(--color-overdue-text)]">{saveError}</p>}

        {reservation?.finalTime && (
          <p className="text-lg font-semibold text-[var(--color-overdue-text)]">
            Final time: {formatTime12Hour(reservation.finalTime)}
          </p>
        )}

        {reservation && (
          <button
            type="button"
            onClick={handleClear}
            className="mt-auto rounded-md border border-[var(--color-overdue-border)] px-4 py-2 font-medium text-[var(--color-overdue-text)]"
          >
            Clear table
          </button>
        )}
      </div>
    </div>
  );
}
