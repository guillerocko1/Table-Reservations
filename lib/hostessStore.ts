import { supabase } from "./supabaseClient";
import { rowToHostess, type Hostess, type HostessRow } from "./hostessRows";

export type RealtimeConnectionStatus = "connected" | "disconnected";

// Alphabetized for a scannable dropdown - same convention the servers
// list (lib/employeeStore.ts) uses.
export async function fetchHostesses(): Promise<Hostess[]> {
  const { data, error } = await supabase.from("hostesses").select("*").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: HostessRow) => rowToHostess(row));
}

export async function addHostess(name: string): Promise<void> {
  const { error } = await supabase.from("hostesses").insert({ name });
  if (error) throw error;
}

export async function updateHostessName(id: number, name: string): Promise<void> {
  const { error } = await supabase.from("hostesses").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function removeHostess(id: number): Promise<void> {
  const { error } = await supabase.from("hostesses").delete().eq("id", id);
  if (error) throw error;
}

// Any insert/update/delete on the table triggers a full refetch rather
// than patching the changed row from the realtime payload - simpler, same
// reasoning as employeeStore's subscribe.
export function subscribeToHostesses(
  onChange: (hostesses: Hostess[]) => void,
  onStatusChange: (status: RealtimeConnectionStatus) => void,
): () => void {
  const channel = supabase
    .channel("hostesses-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "hostesses" }, () => {
      fetchHostesses()
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
