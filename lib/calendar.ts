import { isRussianHoliday, isRussianPreHoliday } from "@/lib/holidays/ru";
import type { CalendarDay } from "@/lib/types";

const monthCalendarCache = new Map<string, CalendarDay[]>();

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function toDateString(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function getMonthCalendar(year: number, month: number): CalendarDay[] {
  const cacheKey = `${year}-${month}`;
  const cached = monthCalendarCache.get(cacheKey);
  if (cached) return cached;

  const daysCount = getDaysInMonth(year, month);
  const days: CalendarDay[] = [];

  for (let day = 1; day <= daysCount; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateStr = toDateString(year, month, day);
    const isHoliday = isRussianHoliday(dateStr, year);
    const isPreHoliday = isRussianPreHoliday(dateStr, year);
    const isWorkingDay = !isWeekend && !isHoliday;

    days.push({
      day,
      date: dateStr,
      isWeekend,
      isHoliday,
      isPreHoliday,
      isWorkingDay,
    });
  }

  monthCalendarCache.set(cacheKey, days);
  return days;
}

export function countWorkingDays(year: number, month: number): number {
  return getMonthCalendar(year, month).filter((d) => d.isWorkingDay).length;
}

export function isDateInVacation(
  date: string,
  vacations: { from: string; to: string }[],
): boolean {
  return vacations.some((v) => date >= v.from && date <= v.to);
}
