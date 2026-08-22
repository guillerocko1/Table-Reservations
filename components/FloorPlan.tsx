import { ZONES } from "@/lib/tables";
import type { Reservation, ReservationStatus } from "@/lib/reservations";
import { TableCard } from "./TableCard";

interface FloorPlanProps {
  reservationsByTable: Record<number, Reservation>;
  getStatus: (tableNumber: number) => ReservationStatus;
  onSelectTable: (tableNumber: number) => void;
}

export function FloorPlan({ reservationsByTable, getStatus, onSelectTable }: FloorPlanProps) {
  return (
    <div className="flex flex-col gap-8">
      {ZONES.map((zone) => (
        <section key={zone.id}>
          <h2 className="mb-3 font-serif text-lg font-semibold text-[var(--color-text)]">
            {zone.label}
          </h2>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
            {zone.tableNumbers.map((tableNumber) => (
              <TableCard
                key={tableNumber}
                tableNumber={tableNumber}
                status={getStatus(tableNumber)}
                reservation={reservationsByTable[tableNumber]}
                onSelect={onSelectTable}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
