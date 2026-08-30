import type { EightySixItem } from "@/lib/eightySixRows";

interface EightySixBannerProps {
  items: EightySixItem[];
}

// Shown near the top of every view (admin, staff, by-server) — 86'd dishes
// are urgent, restaurant-wide information, not tied to any one table, so
// they get their own oversized, red callout rather than being buried in a
// per-table panel. Renders nothing when the list is empty, so it doesn't
// take up space when there's nothing to report.
export function EightySixBanner({ items }: EightySixBannerProps) {
  if (items.length === 0) return null;

  return (
    <p className="text-2xl font-bold text-[var(--color-overdue-text)]">
      86&apos;d: {items.map((item) => item.dishName).join(", ")}
    </p>
  );
}
