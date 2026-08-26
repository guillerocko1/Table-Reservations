import { supabase } from "./supabaseClient";
import { rowToReservation, reservationToRow, type ReservationRow } from "./reservationRows";
import type { Reservation } from "./reservations";

export type RealtimeConnectionStatus = "connected" | "disconnected";

export async function fetchAllReservations(): Promise<Record<number, Reservation>> {
  const { data, error } = await supabase.from("reservations").select("*");
  if (error) throw error;
  const byTable: Record<number, Reservation> = {};
  for (const row of (data ?? []) as ReservationRow[]) {
    const reservation = rowToReservation(row);
    byTable[reservation.tableNumber] = reservation;
  }
  return byTable;
}

export async function upsertReservation(reservation: Reservation): Promise<void> {
  const { error } = await supabase
    .from("reservations")
    .upsert(reservationToRow(reservation), { onConflict: "table_number" });
  if (error) throw error;
}

export async function deleteReservation(tableNumber: number): Promise<void> {
  const { error } = await supabase.from("reservations").delete().eq("table_number", tableNumber);
  if (error) throw error;
}

// Any insert/update/delete on the table triggers a full refetch rather than
// patching the changed row from the realtime payload - simpler, and cheap
// since this table only ever holds one row per table number (a few dozen
// at most).
export function subscribeToReservations(
  onChange: (byTable: Record<number, Reservation>) => void,
  onStatusChange: (status: RealtimeConnectionStatus) => void,
): () => void {
  const channel = supabase
    .channel("reservations-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => {
      fetchAllReservations()
        .then(onChange)
        .catch(() => {
          // A transient refetch failure here just misses this one realtime
          // event; the next change (or reconnect) catches the table back up.
        });
    })
    .subscribe((status) => {
      onStatusChange(status === "SUBSCRIBED" ? "connected" : "disconnected");
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
