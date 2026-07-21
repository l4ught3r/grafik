import { getMonthCalendar, isDateInVacation } from "@/lib/calendar";
import { isSickDay } from "@/lib/sick-days";
import type { Schedule } from "@/lib/types";

const DND_ID_PREFIX = "schedule-cell:";
const DND_DRAG_PREFIX = "schedule-drag:";
const DND_DROP_PREFIX = "schedule-drop:";

export interface ScheduleCellRef {
  employeeId: string;
  day: number;
}

export interface ScheduleDragData extends ScheduleCellRef {
  hours: number;
}

export function toScheduleDragId(employeeId: string, day: number): string {
  return `${DND_DRAG_PREFIX}${employeeId}:${day}`;
}

export function toScheduleDropId(employeeId: string, day: number): string {
  return `${DND_DROP_PREFIX}${employeeId}:${day}`;
}

/** @deprecated use toScheduleDragId / toScheduleDropId */
export function toScheduleDndId(employeeId: string, day: number): string {
  return toScheduleDragId(employeeId, day);
}

function parsePrefixedId(
  id: string | number,
  prefix: string,
): ScheduleCellRef | null {
  if (typeof id !== "string" || !id.startsWith(prefix)) {
    return null;
  }

  const payload = id.slice(prefix.length);
  const separatorIndex = payload.lastIndexOf(":");
  if (separatorIndex <= 0) return null;

  const employeeId = payload.slice(0, separatorIndex);
  const day = Number(payload.slice(separatorIndex + 1));
  if (!employeeId || !Number.isInteger(day) || day < 1) return null;

  return { employeeId, day };
}

export function parseScheduleDragId(id: string | number): ScheduleCellRef | null {
  return parsePrefixedId(id, DND_DRAG_PREFIX);
}

export function parseScheduleDropId(id: string | number): ScheduleCellRef | null {
  return parsePrefixedId(id, DND_DROP_PREFIX);
}

export function parseScheduleDndId(
  id: string | number,
): ScheduleCellRef | null {
  return parseScheduleDragId(id) ?? parseScheduleDropId(id);
}

export function isScheduleDndId(id: string | number): boolean {
  return parseScheduleDndId(id) != null;
}

export function canDropShift(
  active: ScheduleCellRef,
  over: ScheduleCellRef,
  schedule: Schedule,
): boolean {
  if (active.employeeId === over.employeeId && active.day === over.day) {
    return false;
  }

  const calendar = getMonthCalendar(schedule.year, schedule.month);
  const calendarDay = calendar.find((day) => day.day === over.day);
  const employee = schedule.employees.find((emp) => emp.id === over.employeeId);
  if (!calendarDay || !employee) return false;

  if (isDateInVacation(calendarDay.date, employee.vacations)) return false;
  if (isSickDay(schedule.sickDays, over.employeeId, over.day)) return false;

  return true;
}

export function getDropTargetTitle(
  active: ScheduleCellRef,
  over: ScheduleCellRef,
  schedule: Schedule,
): string | undefined {
  if (!canDropShift(active, over, schedule)) return undefined;

  const hasTargetHours = schedule.cells[over.employeeId]?.[over.day] != null;
  return hasTargetHours ? "Обмен сменами" : undefined;
}
