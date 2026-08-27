import {
  colorTierFor,
  formatTime12Hour,
  minutesUntil,
  statusFor,
  type ColorTier,
  type Reservation,
  type ReservationStatus,
} from "@/lib/reservations";

interface ServerTableCardProps {
  reservation: Reservation;
  now: Date;
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  overdue: "Overdue",
};

// Same color tiers as the floor plan (TableCard) — a table reads the same
// way here as it does there, just grouped by server instead of by zone.
const COLOR_TIER_STYLES: Record<ColorTier, string> = {
  available:
    "bg-[var(--color-available-bg)] border-[var(--color-available-border)] text-[var(--color-available-text)]",
  reserved:
    "bg-[var(--color-reserved-bg)] border-[var(--color-reserved-border)] text-[var(--color-reserved-text)]",
  occupied:
    "bg-[var(--color-occupied-bg)] border-[var(--color-occupied-border)] text-[var(--color-occupied-text)]",
  warning: "bg-[var(--color-warning-bg)] border-[var(--color-warning-border)] text-[var(--color-warning-text)]",
  overdue:
    "bg-[var(--color-overdue-bg)] border-[var(--color-overdue-border)] text-[var(--color-overdue-text)]",
};

// Read-only summary card for one table, used by the "by server" view — a
// reservation is always present here (a server only ever lists tables it
// actually has), unlike TableCard which also renders empty tables.
export function ServerTableCard({ reservation, now }: ServerTableCardProps) {
  const status = statusFor(reservation, now);
  const colorClass = COLOR_TIER_STYLES[colorTierFor(status, reservation, now)];

  return (
    <div className={`flex flex-col gap-1.5 rounded-lg border-2 p-3 ${colorClass}`}>
      <div className="flex items-center justify-between">
        <span className="font-serif text-xl font-bold">Table {reservation.tableNumber}</span>
        <span className="text-sm font-medium uppercase tracking-wide">{STATUS_LABELS[status]}</span>
      </div>
      <p className="text-base font-semibold">
        {reservation.tags.length > 0 && "★ "}
        {reservation.guestName} · {reservation.partySize}
      </p>
      {reservation.celebration !== "None" && <p className="text-sm">{reservation.celebration}</p>}
      {reservation.allergies && <p className="text-sm">Allergies: {reservation.allergies}</p>}
      {/* Final time / minutes left get the same big, bold emphasis they get
          in ReservationDetails — the one number staff scan for fastest. */}
      {reservation.finalTime ? (
        <p className="text-xl font-bold">
          {minutesUntil(reservation.finalTime, now)} min left · final {formatTime12Hour(reservation.finalTime)}
        </p>
      ) : (
        <p className="text-sm">Not seated yet · booked {formatTime12Hour(reservation.reservationTime)}</p>
      )}
    </div>
  );
}
