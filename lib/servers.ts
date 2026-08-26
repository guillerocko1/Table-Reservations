import { supabase } from "./supabaseClient";
import { MAX_SERVERS, rowsToServerNames, type ServerRow } from "./serverRows";

export { MAX_SERVERS };

export type RealtimeConnectionStatus = "connected" | "disconnected";

export async function fetchServerNames(): Promise<string[]> {
  const { data, error } = await supabase.from("servers").select("*");
  if (error) throw error;
  return rowsToServerNames((data ?? []) as ServerRow[]);
}

export async function setServerNameRemote(index: number, name: string): Promise<void> {
  const { error } = await supabase
    .from("servers")
    .upsert({ slot_index: index, name }, { onConflict: "slot_index" });
  if (error) throw error;
}

export function subscribeToServers(
  onChange: (names: string[]) => void,
  onStatusChange: (status: RealtimeConnectionStatus) => void,
): () => void {
  const channel = supabase
    .channel("servers-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "servers" }, () => {
      fetchServerNames()
        .then(onChange)
        .catch(() => {
          // Same reasoning as reservationsStore's subscribe: a missed
          // refetch here just skips one realtime event.
        });
    })
    .subscribe((status) => {
      onStatusChange(status === "SUBSCRIBED" ? "connected" : "disconnected");
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
