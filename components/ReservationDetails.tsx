import {
  formatTime12Hour,
  minutesSince,
  minutesUntil,
  type Reservation,
  type ReservationStatus,
} from "@/lib/reservations";

interface ReservationDetailsProps {
  tableNumber: number | null;
  reservation: Reservation | undefined;
  status: ReservationStatus;
  now: Date;
  onClose: () => void;
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  overdue: "Overdue",
};

// Shared by Minutes left and Final time — the two numbers staff need to
// notice fastest when checking whether a table's about to turn over.
const COUNTDOWN_VALUE_CLASS = "text-3xl font-bold text-[var(--color-overdue-text)]";

// Read-only counterpart to ReservationPanel — same layout conventions, but
// plain text throughout: no inputs, no Save/Seat/Clear actions. This is the
// only thing the staff view lets someone open.
export function ReservationDetails({ tableNumber, reservation, status, now, onClose }: ReservationDetailsProps) {
  if (tableNumber === null) return null;

  const seatedMinutes =
    reservation?.startTime && (status === "occupied" || status === "overdue")
      ? minutesSince(reservation.startTime, now)
      : null;

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

        <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          {STATUS_LABELS[status]}
          {seatedMinutes !== null && ` · seated ${seatedMinutes} min`}
        </p>

        {reservation ? (
          <dl className="flex flex-col gap-4">
            <Detail
              label="Guest name"
              value={reservation.tags.length > 0 ? `★ ${reservation.guestName}` : reservation.guestName}
            />
            <Detail
              label="Guest tags"
              value={reservation.tags.length > 0 ? reservation.tags.join(", ") : "None"}
            />
            <Detail label="Party size" value={String(reservation.partySize)} />
            <Detail label="Special celebration" value={reservation.celebration} />
            <Detail label="Allergies / notes" value={reservation.allergies || "None noted"} />
            <Detail label="Reservation time" value={reservation.reservationTime} />
            {/* Start and Final time get their own colors — they're the two
                numbers staff scan for fastest to judge how a table's doing. */}
            <Detail
              label="Start time"
              value={reservation.startTime ? formatTime12Hour(reservation.startTime) : "Not seated yet"}
              valueClassName="text-lg font-semibold text-[var(--color-occupied-text)]"
            />
            <Detail label="Time limit" value={`${reservation.timeLimitMinutes} min`} />
            {/* Minutes left and Final time share the same large, bold,
                overdue-colored treatment — they're the two numbers staff
                notice fastest when checking a table. */}
            <Detail
              label="Minutes left"
              value={reservation.finalTime ? `${minutesUntil(reservation.finalTime, now)} min` : "Not seated yet"}
              valueClassName={COUNTDOWN_VALUE_CLASS}
            />
            <Detail
              label="Final time"
              value={reservation.finalTime ? formatTime12Hour(reservation.finalTime) : "—"}
              valueClassName={COUNTDOWN_VALUE_CLASS}
            />
            <Detail
              label="Server name"
              value={reservation.serverName || "Unassigned"}
              valueClassName="text-lg font-semibold text-[var(--color-accent)]"
            />
          </dl>
        ) : (
          <p className="text-base text-[var(--color-text-muted)]">This table is available — no reservation.</p>
        )}
      </div>
    </div>
  );
}

// valueClassName, when given, fully replaces the default size/weight/color
// together (not appended alongside it) — callers that need a bigger size
// (Final time) would otherwise fight the default text-lg for the same
// text-size utility slot.
function Detail({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div>
      <dt className="text-sm text-[var(--color-text-muted)]">{label}</dt>
      <dd className={valueClassName ?? "text-lg font-semibold text-[var(--color-text)]"}>{value}</dd>
    </div>
  );
}
