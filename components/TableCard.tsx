import { minutesSince, type Reservation, type ReservationStatus } from "@/lib/reservations";
import type { TableShape } from "@/lib/tables";

interface TableCardProps {
  tableNumber: number;
  status: ReservationStatus;
  reservation: Reservation | undefined;
  now: Date;
  shape: TableShape;
  /** Table 56 — the large round booth in the real floor plan. Renders as a
   *  circle, a bit bigger than the other booths, instead of the standard
   *  booth frame. */
  round?: boolean;
  /** Bar Lounge (61-63) renders a size down from the standard table/booth
   *  frame; Bar (1-16) renders a size down from the standard seat frame —
   *  16 seats need to be smaller than High-Tops' 9 to fit the same width. */
  small?: boolean;
  /** The eight 2-top dining tables (31/32/35/37/41/43/46/47) — same height
   *  as a standard table, narrower width. Distinct from `small` above,
   *  which also shrinks height (fine for Bar Lounge, wrong for a dining
   *  row where every table shares the same row height). */
  twoTop?: boolean;
  /** Tables 33, 36, 42, 45 — a little wider than the standard table frame,
   *  short of the `wide` tables below. */
  mediumWide?: boolean;
  /** Tables 34 and 44 — wider than the standard table frame (same height,
   *  more width), for tables that seat more people. */
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

// Per-shape frame classes. Every shape is a fixed size (not sized by its
// container), so a table looks identical everywhere it appears on the page
// — Bar Lounge included — regardless of which column it's laid out in.
// Seats are small circles (bar stools / high-tops); tables and booths are
// the same larger size, differing only in corner rounding to suggest the
// booths' curved backs.
const SHAPE_FRAME: Record<TableShape, string> = {
  seat: "h-14 w-14 shrink-0 rounded-full",
  table: "h-28 w-28 shrink-0 rounded-lg",
  booth: "h-28 w-28 shrink-0 rounded-t-[999px] rounded-b-lg",
};

// Table 56's frame overrides SHAPE_FRAME entirely — a full circle, one size
// up from the standard booth, rather than the booths' rounded-top shape.
const ROUND_FRAME = "h-32 w-32 shrink-0 rounded-full";

// Bar Lounge's frame — same rounded-rectangle look as a standard table,
// just a size down.
const SMALL_FRAME = "h-24 w-24 shrink-0 rounded-lg";

// Bar's frame — same circle as a standard seat, just a size down so all 16
// fit, edge to edge, across the same width High-Tops' 9 seats use.
const SMALL_SEAT_FRAME = "h-10 w-10 shrink-0 rounded-full";

// Tables 34/44's frame — same height as a standard table, noticeably wider.
const WIDE_FRAME = "h-28 w-44 shrink-0 rounded-lg";

// The eight 2-top dining tables' frame — same height as a standard table
// (they share a row with the others), narrower width.
const TWO_TOP_FRAME = "h-28 w-24 shrink-0 rounded-lg";

// Tables 33/36/42/45's frame — same height as a standard table, a little
// wider (between a 2-top and the `wide` tables).
const MEDIUM_WIDE_FRAME = "h-28 w-36 shrink-0 rounded-lg";

export function TableCard({
  tableNumber,
  status,
  reservation,
  now,
  shape,
  round,
  small,
  twoTop,
  mediumWide,
  wide,
  onSelect,
}: TableCardProps) {
  // Only a seated table has a start time to count from — Available/Reserved
  // tables show no counter.
  const seatedMinutes =
    reservation?.startTime && (status === "occupied" || status === "overdue")
      ? minutesSince(reservation.startTime, now)
      : null;

  const title = reservation
    ? `Table ${tableNumber} · ${STATUS_LABELS[status]} · ${reservation.guestName} · ${reservation.partySize}${
        reservation.tags.length > 0 ? ` · ${reservation.tags.join(", ")}` : ""
      }${seatedMinutes !== null ? ` · seated ${seatedMinutes} min` : ""}`
    : `Table ${tableNumber} · ${STATUS_LABELS[status]}`;

  if (shape === "seat") {
    const seatFrame = small ? SMALL_SEAT_FRAME : SHAPE_FRAME.seat;

    return (
      <button
        type="button"
        onClick={() => onSelect(tableNumber)}
        title={title}
        className={`flex flex-col items-center justify-center gap-0.5 border-2 text-center transition hover:brightness-95 ${seatFrame} ${STATUS_STYLES[status]}`}
      >
        <span className={`font-serif font-bold ${small ? "text-[10px]" : "text-sm"}`}>{tableNumber}</span>
        {/* A 40px circle can't fit a second line legibly — full details
            (including seated minutes) are still one click or hover away. */}
        {!small && seatedMinutes !== null && <span className="text-[9px] font-semibold">{seatedMinutes}m</span>}
      </button>
    );
  }

  const frameClass = round
    ? ROUND_FRAME
    : wide
      ? WIDE_FRAME
      : mediumWide
        ? MEDIUM_WIDE_FRAME
        : twoTop
          ? TWO_TOP_FRAME
          : small
            ? SMALL_FRAME
            : SHAPE_FRAME[shape];

  return (
    <button
      type="button"
      onClick={() => onSelect(tableNumber)}
      className={`flex flex-col items-center justify-center gap-1 border-2 p-2 text-center transition hover:brightness-95 ${frameClass} ${STATUS_STYLES[status]}`}
    >
      <span className="font-serif text-xl font-bold">{tableNumber}</span>
      <span className="text-[11px] font-medium uppercase tracking-wide">{STATUS_LABELS[status]}</span>
      {reservation && (
        <span className="truncate text-xs">
          {reservation.tags.length > 0 && "★ "}
          {reservation.guestName} · {reservation.partySize}
        </span>
      )}
      {seatedMinutes !== null && (
        <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">{seatedMinutes} min</span>
      )}
    </button>
  );
}
