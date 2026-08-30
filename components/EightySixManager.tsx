"use client";

import { useState } from "react";
import type { EightySixItem } from "@/lib/eightySixRows";

interface EightySixManagerProps {
  items: EightySixItem[];
  onAdd: (dishName: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}

// Admin-only controls for the 86 list — the read-only EightySixBanner
// (shown on every view, including this page) already displays the current
// list in big red text; this adds the input and remove buttons to manage it.
export function EightySixManager({ items, onAdd, onRemove }: EightySixManagerProps) {
  const [dishName, setDishName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const trimmed = dishName.trim();
    if (!trimmed) return;
    setError(null);
    try {
      await onAdd(trimmed);
      setDishName("");
    } catch {
      setError("Couldn't add — check your connection and try again.");
    }
  }

  async function handleRemove(id: number) {
    setError(null);
    try {
      await onRemove(id);
    } catch {
      setError("Couldn't remove — check your connection and try again.");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-2">
        <input
          className="flex-1 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          placeholder="Dish name"
          value={dishName}
          onChange={(event) => setDishName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleAdd();
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="whitespace-nowrap rounded-md bg-[var(--color-overdue-text)] px-3 py-2 text-sm font-medium text-white"
        >
          86 it
        </button>
      </div>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-1.5 rounded-full border border-[var(--color-overdue-border)] bg-[var(--color-overdue-bg)] px-2.5 py-1 text-sm font-bold text-[var(--color-overdue-text)]"
            >
              86 - {item.dishName}
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                aria-label={`Remove ${item.dishName} from the 86 list`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-[var(--color-overdue-text)]">{error}</p>}
    </div>
  );
}
