// Table shape drives how TableCard renders a zone's tables: "seat" for
// individually-numbered stools (Bar, High-Tops), "table" for standard
// rectangular tables, "booth" for the curved banquette seating.
export type TableShape = "seat" | "table" | "booth";

export interface Zone {
  id: string;
  label: string;
  shape: TableShape;
  tableNumbers: number[];
}

function range(start: number, end: number): number[] {
  const numbers: number[] = [];
  for (let n = start; n <= end; n++) numbers.push(n);
  return numbers;
}

// Mirrors the restaurant's actual floor plan: Bar Lounge sits by the entry
// on its own, the Bar counter and High-Top stools sit between the bar and
// the dining room, and the dining room itself is two rows of tables plus a
// row of curved booths.
//
// Each zone's tableNumbers array is in DISPLAY order, not numeric order —
// the real floor plan reads right to left (higher numbers on the left) for
// every row, and top to bottom for the vertical Bar Lounge column, so the
// ranges below are reversed to match.
export const ZONES: Zone[] = [
  { id: "bar-lounge", label: "Bar Lounge", shape: "table", tableNumbers: range(61, 63).reverse() },
  { id: "bar", label: "Bar", shape: "seat", tableNumbers: range(1, 16).reverse() },
  { id: "high-tops", label: "High-Tops", shape: "seat", tableNumbers: range(21, 29).reverse() },
  { id: "main-a", label: "Main Dining — Row 1", shape: "table", tableNumbers: range(31, 37).reverse() },
  { id: "main-b", label: "Main Dining — Row 2", shape: "table", tableNumbers: range(41, 47).reverse() },
  { id: "main-c", label: "Main Dining — Booths", shape: "booth", tableNumbers: range(51, 56).reverse() },
];

export const ALL_TABLE_NUMBERS: number[] = ZONES.flatMap((zone) => zone.tableNumbers);

// Table 56 is drawn as a large round booth in the real floor plan — a
// circle, distinct from the other booths' rounded-rectangle shape.
export function isRoundTable(tableNumber: number): boolean {
  return tableNumber === 56;
}
