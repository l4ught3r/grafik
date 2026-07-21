import { getDaysInMonth, toDateString } from "@/lib/calendar";

export function compareIsoDates(a: string, b: string): number {
  return a.localeCompare(b);
}

export function normalizeRange(
  from: string,
  to: string,
): { from: string; to: string } {
  if (compareIsoDates(from, to) <= 0) {
    return { from, to };
  }
  return { from: to, to: from };
}

export function isDateInRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

export function getMonthGrid(year: number, month: number): (number | null)[] {
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = getDaysInMonth(year, month);
  const cells: (number | null)[] = Array.from(
    { length: firstWeekday },
    () => null,
  );

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function toIsoDate(year: number, month: number, day: number): string {
  return toDateString(year, month, day);
}

export function formatDisplayDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}.${month}`;
}
