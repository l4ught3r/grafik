import { isDateInVacation } from "@/lib/calendar";
import { canAssignShift, getShiftHours, type ShiftMode } from "@/lib/hours";
import { isCellLocked } from "@/lib/month-plan";
import { isSickDay } from "@/lib/sick-days";
import type {
  CalendarDay,
  Schedule,
  ScheduleEmployee,
  ScheduleSickDays,
  ShiftType,
} from "@/lib/types";

export function getEmployeeHours(
  employeeId: string,
  cells: Schedule["cells"],
): number {
  const empCells = cells[employeeId] ?? {};
  return Object.values(empCells).reduce<number>((sum, h) => sum + (h ?? 0), 0);
}

export function isOnVacation(
  employee: ScheduleEmployee,
  day: CalendarDay,
): boolean {
  return isDateInVacation(day.date, employee.vacations);
}

export function isDayFree(
  employeeId: string,
  day: number,
  cells: Schedule["cells"],
): boolean {
  return cells[employeeId]?.[day] == null;
}

export function workedOnPreviousDay(
  employeeId: string,
  day: number,
  cells: Schedule["cells"],
): boolean {
  if (day <= 1) return false;
  return cells[employeeId]?.[day - 1] != null;
}

export function workedOnNextDay(
  employeeId: string,
  day: number,
  cells: Schedule["cells"],
): boolean {
  return cells[employeeId]?.[day + 1] != null;
}

export function hasAdjacentShift(
  employeeId: string,
  day: number,
  cells: Schedule["cells"],
): boolean {
  return (
    workedOnPreviousDay(employeeId, day, cells) ||
    workedOnNextDay(employeeId, day, cells)
  );
}

export function needsRestBetweenShifts(shiftType: ShiftType): boolean {
  return shiftType === "night" || shiftType === "aux";
}

function isSunday(day: CalendarDay): boolean {
  return new Date(`${day.date}T12:00:00`).getDay() === 0;
}

export function respectsWeekendRule(
  employee: ScheduleEmployee,
  day: CalendarDay,
  cells: Schedule["cells"],
): boolean {
  if (!needsRestBetweenShifts(employee.shiftType)) return true;
  if (!isSunday(day) || day.day <= 1) return true;

  return !workedOnPreviousDay(employee.id, day.day, cells);
}

export function canAssign(
  employee: ScheduleEmployee,
  day: CalendarDay,
  cells: Schedule["cells"],
  sickDays?: ScheduleSickDays,
  mode: ShiftMode = "night",
  lockedCells?: Set<string>,
): boolean {
  if (isCellLocked(lockedCells, employee.id, day.day)) return false;
  if (!canAssignShift(employee.shiftType, day)) return false;
  if (isOnVacation(employee, day)) return false;
  if (isSickDay(sickDays, employee.id, day.day)) return false;
  if (!isDayFree(employee.id, day.day, cells)) return false;
  if (getShiftHours(employee.shiftType, day, mode) == null) return false;

  if (needsRestBetweenShifts(employee.shiftType)) {
    if (hasAdjacentShift(employee.id, day.day, cells)) return false;
    if (!respectsWeekendRule(employee, day, cells)) return false;
  }

  return true;
}

/**
 * Мутирует переданный объект cells in-place для производительности.
 * НЕ передавайте live React state — только свежий объект из initCells().
 */
export function assignShift(
  employee: ScheduleEmployee,
  day: CalendarDay,
  cells: Schedule["cells"],
  sickDays?: ScheduleSickDays,
  mode: ShiftMode = "night",
  lockedCells?: Set<string>,
): boolean {
  if (!canAssign(employee, day, cells, sickDays, mode, lockedCells)) {
    return false;
  }

  const hours = getShiftHours(employee.shiftType, day, mode);
  if (hours == null) return false;

  if (!cells[employee.id]) cells[employee.id] = {};
  cells[employee.id][day.day] = hours;
  return true;
}

/**
 * Мутирует cells in-place. См. assignShift.
 */
export function removeShift(
  employeeId: string,
  day: number,
  cells: Schedule["cells"],
  lockedCells?: Set<string>,
): void {
  if (isCellLocked(lockedCells, employeeId, day)) return;
  const empCells = cells[employeeId];
  if (!empCells) return;
  delete empCells[day];
}

export function daysSinceLastShift(
  employeeId: string,
  currentDay: number,
  cells: Schedule["cells"],
): number {
  const empCells = cells[employeeId] ?? {};
  let lastDay = 0;

  for (const dayKey of Object.keys(empCells)) {
    const day = Number(dayKey);
    if (day < currentDay && empCells[day] != null) {
      lastDay = Math.max(lastDay, day);
    }
  }

  return lastDay === 0 ? Number.POSITIVE_INFINITY : currentDay - lastDay;
}
