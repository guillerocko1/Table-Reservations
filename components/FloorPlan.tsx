import { ZONES, isRoundTable, isSmallTable, isMediumWideTable, isWideTable, type Zone } from "@/lib/tables";
import type { Reservation, ReservationStatus } from "@/lib/reservations";
import { TableCard } from "./TableCard";

interface FloorPlanProps {
  reservationsByTable: Record<number, Reservation>;
  getStatus: (tableNumber: number) => ReservationStatus;
  now: Date;
  onSelectTable: (tableNumber: number) => void;
  /** Roster order (from useServerRoster) — when given, each table's border
   *  is colored by its assigned server instead of by status, and the
   *  server's name shows on the tile. Passed by both the admin and staff
   *  views; see components/TableCard.tsx. */
  serverNames?: string[];
}

// Mirrors the restaurant's actual layout: Bar Lounge sits in its own narrow
// column near the entry, stacked vertically; everything else (Bar,
// High-Tops, the two dining rows, and the booths) sits in the wider column
// in the order you'd walk past them. Every TableCard is a fixed size (see
// components/TableCard.tsx), so cards line up identically in both columns.
const BAR_LOUNGE_ZONE_ID = "bar-lounge";

// These zones spread their tables/seats edge-to-edge across the full row
// width instead of clustering on the left — same tables, same fixed card
// size, just distributed to fill the same area every other row in the main
// column uses.
const DISTRIBUTE_ZONE_IDS = new Set(["bar", "high-tops", "main-a", "main-b", "main-c"]);

// These zones render a size down from the standard frame — Bar Lounge to
// look a little more tucked into its narrow column, and Bar because 16
// seats need to be smaller than High-Tops' 9 to still fit the same width.
// (The dining rows' 2-top tables get a narrower — not shorter — frame via
// isSmallTable/twoTop below, not this zone-wide flag.)
const SMALL_ZONE_IDS = new Set(["bar-lounge", "bar"]);

export function FloorPlan({ reservationsByTable, getStatus, now, onSelectTable, serverNames }: FloorPlanProps) {
  const barLounge = ZONES.find((zone) => zone.id === BAR_LOUNGE_ZONE_ID);
  const mainArea = ZONES.filter((zone) => zone.id !== BAR_LOUNGE_ZONE_ID);

  const zoneProps = { reservationsByTable, getStatus, now, onSelectTable, serverNames };

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {barLounge && (
        <div className="lg:w-32 lg:shrink-0">
          <ZoneSection zone={barLounge} stack small {...zoneProps} />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-8">
        {mainArea.map((zone) => (
          <ZoneSection
            key={zone.id}
            zone={zone}
            distribute={DISTRIBUTE_ZONE_IDS.has(zone.id)}
            small={SMALL_ZONE_IDS.has(zone.id)}
            {...zoneProps}
          />
        ))}
      </div>
    </div>
  );
}

interface ZoneSectionProps {
  zone: Zone;
  reservationsByTable: Record<number, Reservation>;
  getStatus: (tableNumber: number) => ReservationStatus;
  now: Date;
  onSelectTable: (tableNumber: number) => void;
  serverNames?: string[];
  /** Stack tables in a single vertical column instead of wrapping — used
   *  for Bar Lounge, which the real floor plan shows as a vertical strip. */
  stack?: boolean;
  /** Spread tables/seats with equal spacing across the full row width
   *  instead of packing them to the left — used for Bar, High-Tops, and the
   *  booths, so all three match the row width the dining tables use. */
  distribute?: boolean;
  /** Render every table in this zone a size down — used for Bar Lounge and
   *  Bar. The dining rows' 2-top tables use twoTop instead (below), which
   *  keeps the standard row height. */
  small?: boolean;
}

function ZoneSection({
  zone,
  reservationsByTable,
  getStatus,
  now,
  onSelectTable,
  serverNames,
  stack,
  distribute,
  small,
}: ZoneSectionProps) {
  const gapClass = zone.shape === "seat" ? "gap-2" : "gap-3";
  const justifyClass = distribute ? "justify-between" : "";

  return (
    <section>
      <h2 className="mb-3 font-serif text-lg font-semibold text-[var(--color-text)]">{zone.label}</h2>
      <div className={`flex ${stack ? "flex-col" : "flex-wrap"} ${justifyClass} ${gapClass}`}>
        {zone.tableNumbers.map((tableNumber) => (
          <TableCard
            key={tableNumber}
            tableNumber={tableNumber}
            status={getStatus(tableNumber)}
            reservation={reservationsByTable[tableNumber]}
            now={now}
            shape={zone.shape}
            round={isRoundTable(tableNumber)}
            small={small}
            twoTop={isSmallTable(tableNumber)}
            mediumWide={isMediumWideTable(tableNumber)}
            wide={isWideTable(tableNumber)}
            serverNames={serverNames}
            onSelect={onSelectTable}
          />
        ))}
      </div>
    </section>
  );
}
