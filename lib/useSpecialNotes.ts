"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addSpecialNote,
  fetchSpecialNotes,
  markSpecialNoteNotified,
  removeSpecialNote,
  setSpecialNoteNotifyAt,
  subscribeToSpecialNotes,
  type SpecialNoteInput,
} from "./specialNotesStore";
import type { SpecialNote } from "./specialNoteRows";

export interface UseSpecialNotesResult {
  notes: SpecialNote[];
  isConnected: boolean;
  addNote: (input: SpecialNoteInput) => Promise<void>;
  removeNote: (id: number) => Promise<void>;
  setNotifyAt: (id: number, notifyAt: string | null) => Promise<void>;
  markNotified: (id: number) => Promise<void>;
}

export function useSpecialNotes(): UseSpecialNotesResult {
  const [notes, setNotes] = useState<SpecialNote[]>([]);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchSpecialNotes()
      .then((fetched) => {
        if (!cancelled) setNotes(fetched);
      })
      .catch(() => {
        // A failed initial fetch just leaves the list empty until a
        // realtime update (or a future successful fetch) populates it -
        // not surfaced as a blocking error, same reasoning as the 86'd
        // items list: this list isn't essential to using the rest of the app.
      });

    const unsubscribe = subscribeToSpecialNotes(
      (fetched) => {
        if (!cancelled) setNotes(fetched);
      },
      (status) => {
        if (!cancelled) setIsConnected(status === "connected");
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const addNote = useCallback(async (input: SpecialNoteInput) => {
    // A negative, timestamp-based temporary id - guaranteed not to collide
    // with a real database-generated id - shown optimistically until the
    // insert's own realtime echo replaces the whole list with the real row.
    const tempId = -Date.now();
    setNotes((current) => [
      { id: tempId, ...input, notifyAt: null, notifiedAt: null, createdAt: new Date().toISOString() },
      ...current,
    ]);
    try {
      await addSpecialNote(input);
    } catch (error) {
      setNotes((current) => current.filter((note) => note.id !== tempId));
      throw error;
    }
  }, []);

  const removeNote = useCallback(
    async (id: number) => {
      // Scoped to the one removed note (not a whole-list snapshot) so a
      // realtime update for a different note arriving while this delete is
      // in flight isn't discarded by the rollback - same reasoning as
      // useEightySixedItems' per-item rollback.
      const removed = notes.find((note) => note.id === id);
      setNotes((current) => current.filter((note) => note.id !== id));
      try {
        await removeSpecialNote(id);
      } catch (error) {
        if (removed) {
          setNotes((current) => [...current, removed]);
        }
        throw error;
      }
    },
    [notes],
  );

  const setNotifyAt = useCallback(
    async (id: number, notifyAt: string | null) => {
      // Scoped to the one note (not a whole-list snapshot) so a realtime
      // update for a different note arriving while this update is in
      // flight isn't discarded by the rollback - same reasoning as
      // removeNote's per-item rollback.
      const previous = notes.find((note) => note.id === id);
      setNotes((current) => current.map((note) => (note.id === id ? { ...note, notifyAt } : note)));
      try {
        await setSpecialNoteNotifyAt(id, notifyAt);
      } catch (error) {
        if (previous) {
          setNotes((current) => current.map((note) => (note.id === id ? previous : note)));
        }
        throw error;
      }
    },
    [notes],
  );

  // Deliberately never rolls back, unlike every other mutation above: this
  // fires when a full-screen reminder popup is dismissed, and that popup's
  // own visibility is derived from this same note's notifyAt/notifiedAt
  // (see app/page.tsx's dueNote). Rolling back on a failed save would
  // silently re-open a popup the admin just closed - worse than a
  // display/sync that's briefly ahead of the database. The save is still
  // attempted for real (so it reaches other devices once it succeeds); a
  // failure here just means this one device's view won out over the DB
  // until the next successful write catches it up.
  const markNotified = useCallback(async (id: number) => {
    const notifiedAt = new Date().toISOString();
    setNotes((current) => current.map((note) => (note.id === id ? { ...note, notifyAt: null, notifiedAt } : note)));
    try {
      await markSpecialNoteNotified(id);
    } catch {
      // Swallowed - see comment above. The local view already reflects
      // "dismissed"; nothing left for a caller to react to.
    }
  }, []);

  return { notes, isConnected, addNote, removeNote, setNotifyAt, markNotified };
}
