import { minutesSince, type Reservation, type ReservationStatus } from "@/lib/reservations";

interface TableCardProps {
  tableNumber: number;
  status: ReservationStatus;
  reservation: Reservation | undefined;
  now: Date;
  onSelect: (tableNumber: number) => void;
}

const STATUS_STYLES: Record<ReservationStatus, string> = {
  available:
    "bg-[var(--color-available-bg)] border-[var(--color-available-border)] text-[var(--color-available-text)]",
  reserved:
    "bg-[var(--color-reserved-bg)] border-[var(--color-reserved-border)] text-[var(--color-reserved-text)]",
  occupied:
    "bg-[var(--color-occupied-bg)] border-[var(--color-occupied-border)] text-[var(--color-occupied-text)]",
  overdue:
    "bg-[var(--color-overdue-bg)] border-[var(--color-overdue-border)] text-[var(--color-overdue-text)]",
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  overdue: "Overdue",
};

export function TableCard({ tableNumber, status, reservation, now, onSelect }: TableCardProps) {
  // Only a seated table has a start time to count from — Available/Reserved
  // tables show no counter.
  const seatedMinutes =
    reservation?.startTime && (status === "occupied" || status === "overdue")
      ? minutesSince(reservation.startTime, now)
      : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(tableNumber)}
      className={`flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 p-2 text-center transition hover:brightness-95 ${STATUS_STYLES[status]}`}
    >
      <span className="font-serif text-xl font-bold">{tableNumber}</span>
      <span className="text-[11px] font-medium uppercase tracking-wide">{STATUS_LABELS[status]}</span>
      {reservation && (
        <span className="truncate text-xs">
          {reservation.guestName} · {reservation.partySize}
        </span>
      )}
      {seatedMinutes !== null && (
        <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">{seatedMinutes} min</span>
      )}
    </button>
  );
}
