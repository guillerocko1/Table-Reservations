import type { StatusSummary as StatusSummaryData } from "@/lib/reservations";

interface StatusSummaryProps {
  summary: StatusSummaryData;
}

const ITEMS: { key: keyof StatusSummaryData; label: string; dotClass: string }[] = [
  { key: "available", label: "Available", dotClass: "bg-[var(--color-available-border)]" },
  { key: "reserved", label: "Reserved", dotClass: "bg-[var(--color-reserved-border)]" },
  { key: "occupied", label: "Occupied", dotClass: "bg-[var(--color-occupied-border)]" },
  { key: "overdue", label: "Overdue", dotClass: "bg-[var(--color-overdue-border)]" },
];

export function StatusSummary({ summary }: StatusSummaryProps) {
  return (
    <div className="flex flex-wrap gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
      {ITEMS.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${item.dotClass}`} />
          <span className="text-sm text-[var(--color-text-muted)]">{item.label}</span>
          <span className="text-lg font-semibold text-[var(--color-text)]">{summary[item.key]}</span>
        </div>
      ))}
    </div>
  );
}
