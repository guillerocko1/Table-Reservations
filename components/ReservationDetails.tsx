import { minutesSince, type Reservation, type ReservationStatus } from "@/lib/reservations";

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

        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          {STATUS_LABELS[status]}
          {seatedMinutes !== null && ` · seated ${seatedMinutes} min`}
        </p>

        {reservation ? (
          <dl className="flex flex-col gap-3 text-sm">
            <Detail label="Guest name" value={reservation.guestName} />
            <Detail label="Party size" value={String(reservation.partySize)} />
            <Detail label="Special celebration" value={reservation.celebration} />
            <Detail label="Allergies / notes" value={reservation.allergies || "None noted"} />
            <Detail label="Reservation time" value={reservation.reservationTime} />
            <Detail label="Start time" value={reservation.startTime ?? "Not seated yet"} />
            <Detail label="Time limit" value={`${reservation.timeLimitMinutes} min`} />
            <Detail label="Final time" value={reservation.finalTime ?? "—"} />
          </dl>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">This table is available — no reservation.</p>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
      <dd className="font-medium text-[var(--color-text)]">{value}</dd>
    </div>
  );
}
