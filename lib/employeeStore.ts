import { supabase } from "./supabaseClient";
import { rowToEmployee, type Employee, type EmployeeRow } from "./employeeRows";

export type RealtimeConnectionStatus = "connected" | "disconnected";

// Alphabetized - same convention the old hardcoded KNOWN_SERVER_NAMES list
// used, for a scannable dropdown.
export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase.from("employees").select("*").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: EmployeeRow) => rowToEmployee(row));
}

export async function addEmployee(name: string): Promise<void> {
  const { error } = await supabase.from("employees").insert({ name });
  if (error) throw error;
}

export async function updateEmployeeName(id: number, name: string): Promise<void> {
  const { error } = await supabase.from("employees").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function removeEmployee(id: number): Promise<void> {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw error;
}

// Any insert/update/delete on the table triggers a full refetch rather
// than patching the changed row from the realtime payload - simpler, same
// reasoning as eightySixStore's subscribe.
export function subscribeToEmployees(
  onChange: (employees: Employee[]) => void,
  onStatusChange: (status: RealtimeConnectionStatus) => void,
): () => void {
  const channel = supabase
    .channel("employees-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, () => {
      fetchEmployees()
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
