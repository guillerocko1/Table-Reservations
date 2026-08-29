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
  /** Roster order (from useServerRoster) — used to color this card's
   *  border by the same per-server palette the staff floor plan uses (see
   *  components/TableCard.tsx), so a server's color reads the same on
   *  both pages. */
  serverNames: string[];
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  overdue: "Overdue",
};

// Fill/text stay keyed by status tier (unchanged); border is separate so a
// server's color (below) can override just the border while the fill
// still shows status/urgency at a glance — same split as TableCard.
const COLOR_TIER_FILL: Record<ColorTier, string> = {
  available: "bg-[var(--color-available-bg)] text-[var(--color-available-text)]",
  reserved: "bg-[var(--color-reserved-bg)] text-[var(--color-reserved-text)]",
  occupied: "bg-[var(--color-occupied-bg)] text-[var(--color-occupied-text)]",
  warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]",
  overdue: "bg-[var(--color-overdue-bg)] text-[var(--color-overdue-text)]",
};

const COLOR_TIER_BORDER: Record<ColorTier, string> = {
  available: "border-[var(--color-available-border)]",
  reserved: "border-[var(--color-reserved-border)]",
  occupied: "border-[var(--color-occupied-border)]",
  warning: "border-[var(--color-warning-border)]",
  overdue: "border-[var(--color-overdue-border)]",
};

// Same palette, same order as components/TableCard.tsx's
// SERVER_BORDER_CLASSES — kept in sync by hand, both keyed off the same
// roster slot index, so a server's color matches on the staff floor plan
// and here.
const SERVER_BORDER_CLASSES = [
  "border-purple-500",
  "border-teal-500",
  "border-pink-500",
  "border-indigo-500",
  "border-cyan-600",
];

// Read-only summary card for one table, used by the "by server" view — a
// reservation is always present here (a server only ever lists tables it
// actually has), unlike TableCard which also renders empty tables.
export function ServerTableCard({ reservation, now, serverNames }: ServerTableCardProps) {
  const status = statusFor(reservation, now);
  const tier = colorTierFor(status, reservation, now);
  const serverIndex = serverNames.indexOf(reservation.serverName);
  const borderClass = serverIndex >= 0 ? SERVER_BORDER_CLASSES[serverIndex] : COLOR_TIER_BORDER[tier];
  const colorClass = `${COLOR_TIER_FILL[tier]} ${borderClass}`;

  return (
    <div className={`flex flex-col gap-1.5 rounded-lg border-2 p-3 ${colorClass}`}>
      <div className="flex items-center justify-between">
        <span className="font-serif text-xl font-bold">Table {reservation.tableNumber}</span>
        <span className="text-sm font-medium uppercase tracking-wide">{STATUS_LABELS[status]}</span>
      </div>
      <p className="text-base font-semibold">{reservation.guestName}</p>
      {reservation.tags.length > 0 && <p className="text-sm">★ Guest Tags: {reservation.tags.join(", ")}</p>}
      <p className="text-sm">Party Size: {reservation.partySize}</p>
      {reservation.celebration !== "None" && <p className="text-sm">{reservation.celebration}</p>}
      {reservation.allergies && <p className="text-sm">Visit Notes: {reservation.allergies}</p>}
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
