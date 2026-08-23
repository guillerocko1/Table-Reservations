import { minutesSince, type Reservation, type ReservationStatus } from "@/lib/reservations";
import type { TableShape } from "@/lib/tables";

interface TableCardProps {
  tableNumber: number;
  status: ReservationStatus;
  reservation: Reservation | undefined;
  now: Date;
  shape: TableShape;
  /** Tables 33/34/36/44/45/56 are drawn noticeably wider in the real floor
   *  plan (more seats fit around them) — span two grid columns to hint at
   *  that instead of tracking exact widths for every table. */
  wide?: boolean;
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

// Per-shape frame classes. Seats are small fixed-size circles (bar stools /
// high-tops); tables and booths are grid cells sized by their container,
// differing only in corner rounding to suggest the booths' curved backs.
const SHAPE_FRAME: Record<TableShape, string> = {
  seat: "h-14 w-14 shrink-0 rounded-full",
  table: "aspect-square w-full rounded-lg",
  booth: "aspect-square w-full rounded-t-[999px] rounded-b-lg",
};

export function TableCard({ tableNumber, status, reservation, now, shape, wide, onSelect }: TableCardProps) {
  // Only a seated table has a start time to count from — Available/Reserved
  // tables show no counter.
  const seatedMinutes =
    reservation?.startTime && (status === "occupied" || status === "overdue")
      ? minutesSince(reservation.startTime, now)
      : null;

  const title = reservation
    ? `Table ${tableNumber} · ${STATUS_LABELS[status]} · ${reservation.guestName} · ${reservation.partySize}${
        seatedMinutes !== null ? ` · seated ${seatedMinutes} min` : ""
      }`
    : `Table ${tableNumber} · ${STATUS_LABELS[status]}`;

  if (shape === "seat") {
    return (
      <button
        type="button"
        onClick={() => onSelect(tableNumber)}
        title={title}
        className={`flex flex-col items-center justify-center gap-0.5 border-2 text-center transition hover:brightness-95 ${SHAPE_FRAME.seat} ${STATUS_STYLES[status]}`}
      >
        <span className="font-serif text-sm font-bold">{tableNumber}</span>
        {seatedMinutes !== null && <span className="text-[9px] font-semibold">{seatedMinutes}m</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(tableNumber)}
      className={`flex flex-col items-center justify-center gap-1 border-2 p-2 text-center transition hover:brightness-95 ${SHAPE_FRAME[shape]} ${STATUS_STYLES[status]} ${wide ? "sm:col-span-2" : ""}`}
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
