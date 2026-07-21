import { getDaysInMonth, toDateString } from "@/lib/calendar";
import { formatDisplayDate, normalizeRange } from "@/lib/dates";
import type { VacationPeriod } from "@/lib/types";

export interface VacationSpanInMonth {
  startDay: number;
  endDay: number;
  from: string;
  to: string;
}

export function getVacationSpansInMonth(
  year: number,
  month: number,
  vacations: VacationPeriod[],
): VacationSpanInMonth[] {
  const daysInMonth = getDaysInMonth(year, month);
  const monthStart = toDateString(year, month, 1);
  const monthEnd = toDateString(year, month, daysInMonth);
  const spans: VacationSpanInMonth[] = [];

  for (const vacation of vacations) {
    if (!vacation.from || !vacation.to) continue;

    const { from, to } = normalizeRange(vacation.from, vacation.to);
    if (to < monthStart || from > monthEnd) continue;

    const segmentStart = from > monthStart ? from : monthStart;
    const segmentEnd = to < monthEnd ? to : monthEnd;
    const startDay = Number(segmentStart.slice(8, 10));
    const endDay = Number(segmentEnd.slice(8, 10));

    spans.push({
      startDay,
      endDay,
      from,
      to,
    });
  }

  return spans.sort((a, b) => a.startDay - b.startDay);
}

export function isDayInVacation(
  day: number,
  spans: VacationSpanInMonth[],
): boolean {
  return spans.some((span) => day >= span.startDay && day <= span.endDay);
}

export function getVacationSpanForDay(
  day: number,
  spans: VacationSpanInMonth[],
): VacationSpanInMonth | undefined {
  return spans.find((span) => day >= span.startDay && day <= span.endDay);
}

export function getVacationSpanLength(span: VacationSpanInMonth): number {
  return span.endDay - span.startDay + 1;
}

export function formatVacationSpanLabel(from: string, to: string): string {
  return `Отпуск с ${formatDisplayDate(from)} по ${formatDisplayDate(to)}`;
}
