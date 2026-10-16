import { supabase } from "./supabaseClient";
import { rowToSpecialNote, type SpecialNote, type SpecialNoteRow } from "./specialNoteRows";

export type RealtimeConnectionStatus = "connected" | "disconnected";

export interface SpecialNoteInput {
  noteDate: string;
  employeeName: string;
  note: string;
}

// Newest first - unlike eighty_sixed_items (oldest first), a note's own
// date doesn't determine this order: it's "most recently logged" at the
// top, same as scrolling a feed.
export async function fetchSpecialNotes(): Promise<SpecialNote[]> {
  const { data, error } = await supabase
    .from("special_notes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: SpecialNoteRow) => rowToSpecialNote(row));
}

export async function addSpecialNote(input: SpecialNoteInput): Promise<void> {
  const { error } = await supabase
    .from("special_notes")
    .insert({ note_date: input.noteDate, employee_name: input.employeeName, note: input.note });
  if (error) throw error;
}

export async function removeSpecialNote(id: number): Promise<void> {
  const { error } = await supabase.from("special_notes").delete().eq("id", id);
  if (error) throw error;
}

// notifyAt null clears/dismisses the reminder - same function handles
// scheduling and dismissing, since both are just setting this one column.
export async function setSpecialNoteNotifyAt(id: number, notifyAt: string | null): Promise<void> {
  const { error } = await supabase.from("special_notes").update({ notify_at: notifyAt }).eq("id", id);
  if (error) throw error;
}

// Called when the reminder popup is actually dismissed - clears the
// pending reminder and permanently marks this note "Done", distinct from
// setSpecialNoteNotifyAt(id, null) alone, which would just cancel a
// reminder that was never shown.
export async function markSpecialNoteNotified(id: number): Promise<void> {
  const { error } = await supabase
    .from("special_notes")
    .update({ notify_at: null, notified_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Any insert/delete on the table triggers a full refetch rather than
// patching the changed row from the realtime payload - simpler, same
// reasoning as eightySixStore's subscribe.
export function subscribeToSpecialNotes(
  onChange: (notes: SpecialNote[]) => void,
  onStatusChange: (status: RealtimeConnectionStatus) => void,
): () => void {
  const channel = supabase
    .channel("special-notes-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "special_notes" }, () => {
      fetchSpecialNotes()
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
