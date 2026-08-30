import { supabase } from "./supabaseClient";
import { rowToEightySixItem, type EightySixItem, type EightySixRow } from "./eightySixRows";

export type RealtimeConnectionStatus = "connected" | "disconnected";

export async function fetchEightySixedItems(): Promise<EightySixItem[]> {
  const { data, error } = await supabase
    .from("eighty_sixed_items")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: EightySixRow) => rowToEightySixItem(row));
}

export async function addEightySixedItem(dishName: string): Promise<void> {
  const { error } = await supabase.from("eighty_sixed_items").insert({ dish_name: dishName });
  if (error) throw error;
}

export async function removeEightySixedItem(id: number): Promise<void> {
  const { error } = await supabase.from("eighty_sixed_items").delete().eq("id", id);
  if (error) throw error;
}

// Any insert/delete on the table triggers a full refetch rather than
// patching the changed row from the realtime payload — simpler, and this
// table is small (a handful of dishes at most).
export function subscribeToEightySixedItems(
  onChange: (items: EightySixItem[]) => void,
  onStatusChange: (status: RealtimeConnectionStatus) => void,
): () => void {
  const channel = supabase
    .channel("eighty-sixed-items-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "eighty_sixed_items" }, () => {
      fetchEightySixedItems()
        .then(onChange)
        .catch(() => {
          // A transient refetch failure here just misses this one realtime
          // event; the next change (or reconnect) catches the list back up.
        });
    })
    .subscribe((status) => {
      onStatusChange(status === "SUBSCRIBED" ? "connected" : "disconnected");
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
