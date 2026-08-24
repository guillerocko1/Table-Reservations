import { ZONES, type Zone } from "@/lib/tables";
import type { Reservation, ReservationStatus } from "@/lib/reservations";
import { TableCard } from "./TableCard";

interface FloorPlanProps {
  reservationsByTable: Record<number, Reservation>;
  getStatus: (tableNumber: number) => ReservationStatus;
  now: Date;
  onSelectTable: (tableNumber: number) => void;
}

// Mirrors the restaurant's actual layout: Bar Lounge sits in its own narrow
// column near the entry, stacked vertically; everything else (Bar,
// High-Tops, the two dining rows, and the booths) sits in the wider column
// in the order you'd walk past them. Every TableCard is a fixed size (see
// components/TableCard.tsx), so cards line up identically in both columns.
const BAR_LOUNGE_ZONE_ID = "bar-lounge";

// The booths (51-56, one fewer table than the 41-47 row above them) get
// spread edge-to-edge across the same row width instead of clustering on
// the left — same 6 tables, same fixed card size, just distributed to fill
// the space the 40s row uses.
const DISTRIBUTE_ZONE_ID = "main-c";

export function FloorPlan({ reservationsByTable, getStatus, now, onSelectTable }: FloorPlanProps) {
  const barLounge = ZONES.find((zone) => zone.id === BAR_LOUNGE_ZONE_ID);
  const mainArea = ZONES.filter((zone) => zone.id !== BAR_LOUNGE_ZONE_ID);

  const zoneProps = { reservationsByTable, getStatus, now, onSelectTable };

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {barLounge && (
        <div className="lg:w-32 lg:shrink-0">
          <ZoneSection zone={barLounge} stack {...zoneProps} />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-8">
        {mainArea.map((zone) => (
          <ZoneSection key={zone.id} zone={zone} distribute={zone.id === DISTRIBUTE_ZONE_ID} {...zoneProps} />
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
  /** Stack tables in a single vertical column instead of wrapping — used
   *  for Bar Lounge, which the real floor plan shows as a vertical strip. */
  stack?: boolean;
  /** Spread tables with equal spacing across the full row width instead of
   *  packing them to the left — used for the booths, which have one fewer
   *  table than the row above them. */
  distribute?: boolean;
}

function ZoneSection({ zone, reservationsByTable, getStatus, now, onSelectTable, stack, distribute }: ZoneSectionProps) {
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
            onSelect={onSelectTable}
          />
        ))}
      </div>
    </section>
  );
}
