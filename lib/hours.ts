import { getMonthCalendar, isDateInVacation } from "@/lib/calendar";
import type { CalendarDay, ShiftType, VacationPeriod } from "@/lib/types";

export const HOURS_PER_RATE = 7.8;
export const TARGET_MULTIPLIER = 1.5;
export const PRE_HOLIDAY_REDUCTION = 1;

export const SHIFT_HOURS = {
  dayWeekday: 7.8,
  dayPreHoliday: 6.8,
  nightWeekday: 16.2,
  nightPreHoliday: 17.2,
  nightWeekend: 24,
  shift24: 24,
} as const;

export const SHIFT_OPTIONS = [
  SHIFT_HOURS.dayWeekday,
  SHIFT_HOURS.nightWeekday,
  SHIFT_HOURS.shift24,
] as const;

export function getBaseRate(year: number, month: number): number {
  return getMonthCalendar(year, month).reduce<number>((sum, day) => {
    if (!day.isWorkingDay) return sum;
    if (day.isPreHoliday) return sum + SHIFT_HOURS.dayPreHoliday;
    return sum + HOURS_PER_RATE;
  }, 0);
}

export function getTargetHours(year: number, month: number): number {
  return getBaseRate(year, month) * TARGET_MULTIPLIER;
}

/** Режим назначения для гибкого типа aux: день, ночь или сутки. */
export type ShiftMode = "day" | "night" | "shift24";

function getDayShiftHours(calendarDay: CalendarDay): number | null {
  if (!calendarDay.isWorkingDay) return null;
  if (calendarDay.isPreHoliday) return SHIFT_HOURS.dayPreHoliday;
  return SHIFT_HOURS.dayWeekday;
}

function getNightShiftHours(calendarDay: CalendarDay): number {
  if (!calendarDay.isWorkingDay) return SHIFT_HOURS.nightWeekend;
  if (calendarDay.isPreHoliday) return SHIFT_HOURS.nightPreHoliday;
  return SHIFT_HOURS.nightWeekday;
}

export function getShiftHours(
  shiftType: ShiftType,
  calendarDay: CalendarDay,
  mode: ShiftMode = "night",
): number | null {
  if (shiftType === "day") {
    return getDayShiftHours(calendarDay);
  }

  if (shiftType === "night") {
    return getNightShiftHours(calendarDay);
  }

  if (mode === "shift24") {
    return SHIFT_HOURS.shift24;
  }

  return mode === "day"
    ? getDayShiftHours(calendarDay)
    : getNightShiftHours(calendarDay);
}

export function getShiftOptionsForDay(
  shiftType: ShiftType,
  calendarDay: CalendarDay,
): number[] {
  const hours = getShiftHours(shiftType, calendarDay);
  if (hours == null) return [];

  if (shiftType === "day") {
    return [hours, SHIFT_HOURS.shift24];
  }

  if (shiftType === "night") {
    if (!calendarDay.isWorkingDay) {
      return [SHIFT_HOURS.nightWeekend];
    }
    if (calendarDay.isPreHoliday) {
      return [SHIFT_HOURS.nightPreHoliday, SHIFT_HOURS.shift24];
    }
    return [SHIFT_HOURS.nightWeekday, SHIFT_HOURS.shift24];
  }

  const dayHours = getDayShiftHours(calendarDay);
  const nightHours = getNightShiftHours(calendarDay);
  const options =
    dayHours == null
      ? [nightHours, SHIFT_HOURS.shift24]
      : [dayHours, nightHours, SHIFT_HOURS.shift24];
  return [...new Set(options)];
}

export function canAssignShift(
  shiftType: ShiftType,
  calendarDay: CalendarDay,
): boolean {
  if (shiftType === "day") {
    return calendarDay.isWorkingDay;
  }
  return true;
}

export function sumEmployeeHours(cells: Record<number, number | null>): number {
  return Object.values(cells).reduce<number>((sum, h) => sum + (h ?? 0), 0);
}

export function sumEmployeeHoursForMonth(
  cells: Record<number, number | null>,
  vacations: VacationPeriod[],
  calendar: CalendarDay[],
): number {
  return calendar.reduce<number>((sum, day) => {
    if (isDateInVacation(day.date, vacations)) return sum;
    return sum + (cells[day.day] ?? 0);
  }, 0);
}

export function needsRateFloor(shiftType: ShiftType): boolean {
  return shiftType === "night" || shiftType === "aux";
}

/** Смена покрывает день, если это дневные часы или суточная (24ч). */
export function shiftCoversDay(hours: number): boolean {
  return (
    hours === SHIFT_HOURS.shift24 ||
    hours === SHIFT_HOURS.dayWeekday ||
    hours === SHIFT_HOURS.dayPreHoliday
  );
}

/** Смена покрывает ночь, если это ночные часы или сутки aux/night (не дежурство day). */
export function shiftCoversNight(
  hours: number,
  shiftType?: ShiftType,
): boolean {
  if (hours === SHIFT_HOURS.shift24) {
    return shiftType !== "day";
  }
  return (
    hours === SHIFT_HOURS.nightWeekend ||
    hours === SHIFT_HOURS.nightWeekday ||
    hours === SHIFT_HOURS.nightPreHoliday
  );
}

export function isBelowBaseRate(
  hours: number,
  year: number,
  month: number,
): boolean {
  return hours < getBaseRate(year, month);
}

export function getEmployeeRateFraction(
  hours: number,
  baseRate: number,
): number {
  if (baseRate === 0) return 0;
  return hours / baseRate;
}

export function wouldExceedTargetHours(
  currentHours: number,
  shiftHours: number,
  year: number,
  month: number,
): boolean {
  return currentHours + shiftHours > getTargetHours(year, month);
}

export function getEmployeeMonthHours(
  employeeId: string,
  cells: Record<string, Record<number, number | null>>,
  vacations: VacationPeriod[],
  calendar: CalendarDay[],
): number {
  return sumEmployeeHoursForMonth(cells[employeeId] ?? {}, vacations, calendar);
}
