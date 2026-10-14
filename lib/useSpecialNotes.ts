"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addSpecialNote,
  fetchSpecialNotes,
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
    setNotes((current) => [{ id: tempId, ...input, notifyAt: null }, ...current]);
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

  return { notes, isConnected, addNote, removeNote, setNotifyAt };
}
