"use client";

import { useEffect, useState } from "react";
import {
  validateReservationInput,
  GUEST_TAGS,
  type Celebration,
  type GuestTag,
  type Reservation,
  type ReservationInput,
  type TimeLimitMinutes,
} from "@/lib/reservations";

interface ReservationPanelProps {
  tableNumber: number | null;
  reservation: Reservation | undefined;
  onSave: (tableNumber: number, input: ReservationInput) => void;
  onSeat: (tableNumber: number, startTime: string) => void;
  onClear: (tableNumber: number) => void;
  onClose: () => void;
}

const CELEBRATIONS: Celebration[] = ["None", "Birthday", "Anniversary", "Engagement", "Other"];
const TIME_LIMITS: TimeLimitMinutes[] = [30, 60, 90, 120];

function emptyInput(): ReservationInput {
  return {
    guestName: "",
    tags: [],
    partySize: 2,
    celebration: "None",
    allergies: "",
    reservationTime: "18:00",
    timeLimitMinutes: 90,
  };
}

export function ReservationPanel({
  tableNumber,
  reservation,
  onSave,
  onSeat,
  onClear,
  onClose,
}: ReservationPanelProps) {
  const [input, setInput] = useState<ReservationInput>(emptyInput);
  const [startTime, setStartTime] = useState("18:00");
  const [errors, setErrors] = useState<ReturnType<typeof validateReservationInput>["errors"]>({});

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
      });
      // "Seat now" should default to right now, not the booked reservation
      // time — only fall back to the booked time once it's actually seated.
      const nowHHmm = new Date().toTimeString().slice(0, 5);
      setStartTime(reservation.startTime ?? nowHHmm);
    } else {
      setInput(emptyInput());
      setStartTime("18:00");
    }
    setErrors({});
  }, [tableNumber, reservation]);

  if (tableNumber === null) return null;

  function handleSave() {
    const result = validateReservationInput(input);
    setErrors(result.errors);
    if (result.valid) {
      onSave(tableNumber as number, input);
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
          {errors.guestName && <span className="text-xs text-[var(--color-overdue-text)]">{errors.guestName}</span>}
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
          <input
            type="number"
            min={1}
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            value={input.partySize}
            onChange={(event) => setInput({ ...input, partySize: Number(event.target.value) })}
          />
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
          Allergies / notes
          <textarea
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            value={input.allergies}
            onChange={(event) => setInput({ ...input, allergies: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Reservation time
          <input
            type="time"
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            value={input.reservationTime}
            onChange={(event) => setInput({ ...input, reservationTime: event.target.value })}
          />
          {errors.reservationTime && (
            <span className="text-xs text-[var(--color-overdue-text)]">{errors.reservationTime}</span>
          )}
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
                {minutes} min
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 font-medium text-white hover:bg-[var(--color-accent-hover)]"
        >
          {reservation ? "Save changes" : "Add reservation"}
        </button>

        <div className="border-t border-[var(--color-border)] pt-4">
          <label className="flex flex-col gap-1 text-sm">
            Start time (when seated)
            <input
              type="time"
              className="rounded-md border border-[var(--color-border)] px-3 py-2"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Final time is calculated automatically as start time + time limit.
          </p>
          {reservation?.finalTime && (
            <p className="mt-1 text-lg font-semibold text-[var(--color-overdue-text)]">
              Final time: {reservation.finalTime}
            </p>
          )}
          <button
            type="button"
            disabled={!reservation}
            onClick={() => onSeat(tableNumber as number, startTime)}
            className="mt-2 w-full rounded-md border border-[var(--color-accent)] px-4 py-2 font-medium text-[var(--color-accent)] disabled:opacity-40"
          >
            Seat now
          </button>
        </div>

        {reservation && (
          <button
            type="button"
            onClick={() => onClear(tableNumber as number)}
            className="mt-auto rounded-md border border-[var(--color-overdue-border)] px-4 py-2 font-medium text-[var(--color-overdue-text)]"
          >
            Clear table
          </button>
        )}
      </div>
    </div>
  );
}
