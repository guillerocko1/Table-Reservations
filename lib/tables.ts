export interface Zone {
  id: string;
  label: string;
  tableNumbers: number[];
}

function range(start: number, end: number): number[] {
  const numbers: number[] = [];
  for (let n = start; n <= end; n++) numbers.push(n);
  return numbers;
}

export const ZONES: Zone[] = [
  { id: "bar", label: "Bar", tableNumbers: range(1, 16) },
  { id: "main-a", label: "Main Dining A", tableNumbers: range(31, 37) },
  { id: "main-b", label: "Main Dining B", tableNumbers: range(41, 47) },
  { id: "main-c", label: "Main Dining C", tableNumbers: range(51, 56) },
  { id: "main-d", label: "Main Dining D", tableNumbers: range(61, 63) },
];

export const ALL_TABLE_NUMBERS: number[] = ZONES.flatMap((zone) => zone.tableNumbers);
