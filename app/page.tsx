import { StatusSummary } from "@/components/StatusSummary";

export default function Home() {
  const sampleSummary = { available: 39, reserved: 0, occupied: 0, overdue: 0 };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="font-serif text-3xl font-bold text-[var(--color-text)]">Table Reservations</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Bar and main dining floor plan</p>
      </header>
      <StatusSummary summary={sampleSummary} />
    </main>
  );
}
