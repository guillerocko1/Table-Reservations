import { ZONES, isWideTable, type Zone } from "@/lib/tables";
import type { Reservation, ReservationStatus } from "@/lib/reservations";
import { TableCard } from "./TableCard";

interface FloorPlanProps {
  reservationsByTable: Record<number, Reservation>;
  getStatus: (tableNumber: number) => ReservationStatus;
  now: Date;
  onSelectTable: (tableNumber: number) => void;
}

// Mirrors the restaurant's actual layout: Bar Lounge sits in its own column
// near the entry, everything else (Bar, High-Tops, the two dining rows, and
// the booths) stacks in the other column in the order you'd walk past them.
const BAR_LOUNGE_ZONE_ID = "bar-lounge";

export function FloorPlan({ reservationsByTable, getStatus, now, onSelectTable }: FloorPlanProps) {
  const barLounge = ZONES.find((zone) => zone.id === BAR_LOUNGE_ZONE_ID);
  const mainArea = ZONES.filter((zone) => zone.id !== BAR_LOUNGE_ZONE_ID);

  const zoneProps = { reservationsByTable, getStatus, now, onSelectTable };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[180px_1fr]">
      {barLounge && (
        <div className="flex flex-col gap-8">
          <ZoneSection zone={barLounge} {...zoneProps} />
        </div>
      )}
      <div className="flex flex-col gap-8">
        {mainArea.map((zone) => (
          <ZoneSection key={zone.id} zone={zone} {...zoneProps} />
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
}

function ZoneSection({ zone, reservationsByTable, getStatus, now, onSelectTable }: ZoneSectionProps) {
  const isSeatZone = zone.shape === "seat";

  return (
    <section>
      <h2 className="mb-3 font-serif text-lg font-semibold text-[var(--color-text)]">{zone.label}</h2>
      <div className={isSeatZone ? "flex flex-wrap gap-2" : "grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8"}>
        {zone.tableNumbers.map((tableNumber) => (
          <TableCard
            key={tableNumber}
            tableNumber={tableNumber}
            status={getStatus(tableNumber)}
            reservation={reservationsByTable[tableNumber]}
            now={now}
            shape={zone.shape}
            wide={isWideTable(tableNumber)}
            onSelect={onSelectTable}
          />
        ))}
      </div>
    </section>
  );
}
