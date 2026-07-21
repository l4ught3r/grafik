import {
  canAssign,
  daysSinceLastShift,
  needsRestBetweenShifts,
} from "@/lib/assignment";
import type { CalendarDay, Schedule, ScheduleEmployee } from "@/lib/types";

export const LONG_GAP_THRESHOLD = 4;
export const TIGHT_GAP_THRESHOLD = 2;
export const BURST_GAP_COUNT = 2;

export interface SpacingContext {
  calendar: CalendarDay[];
  poolSize: number;
  shiftsPerDay: number;
}

export function getShiftDays(
  employeeId: string,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): number[] {
  const empCells = cells[employeeId] ?? {};
  return calendar
    .filter((day) => empCells[day.day] != null)
    .map((day) => day.day);
}

export function getShiftGaps(
  employeeId: string,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): number[] {
  const days = getShiftDays(employeeId, cells, calendar);
  const gaps: number[] = [];

  for (let i = 1; i < days.length; i++) {
    gaps.push(days[i] - days[i - 1]);
  }

  return gaps;
}

export function getMaxGap(
  employeeId: string,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): number {
  const gaps = getShiftGaps(employeeId, cells, calendar);
  return gaps.length > 0 ? Math.max(...gaps) : 0;
}

export function getAverageGap(
  employeeId: string,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): number {
  const gaps = getShiftGaps(employeeId, cells, calendar);
  if (gaps.length === 0) return 0;
  return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
}

export function getGapVariance(
  employeeId: string,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): number {
  const gaps = getShiftGaps(employeeId, cells, calendar);
  if (gaps.length === 0) return 0;

  const avg = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  return gaps.reduce((sum, gap) => sum + (gap - avg) ** 2, 0) / gaps.length;
}

export function getPoolMaxGap(
  employees: ScheduleEmployee[],
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): number {
  if (employees.length === 0) return 0;

  return Math.max(
    ...employees.map((emp) => getMaxGap(emp.id, cells, calendar)),
  );
}

export function getPoolGapVariance(
  employees: ScheduleEmployee[],
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): number {
  if (employees.length === 0) return 0;

  const variances = employees.map((emp) =>
    getGapVariance(emp.id, cells, calendar),
  );
  return variances.reduce((sum, v) => sum + v, 0) / variances.length;
}

function getEffectiveDaysSince(
  employeeId: string,
  currentDay: number,
  cells: Schedule["cells"],
): number {
  const since = daysSinceLastShift(employeeId, currentDay, cells);
  if (since === Number.POSITIVE_INFINITY) return currentDay - 1;
  return since;
}

export function getIdealGap(
  employee: ScheduleEmployee,
  currentDay: CalendarDay,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
  context: SpacingContext,
): number {
  const shiftDays = getShiftDays(employee.id, cells, calendar);
  const assigned = shiftDays.length;
  const expectedTotal =
    (context.shiftsPerDay * context.calendar.length) / context.poolSize;
  const remainingShifts = Math.max(1, expectedTotal - assigned);

  const remainingDays = calendar.filter((day) => day.day >= currentDay.day);
  const remainingCount = Math.max(1, remainingDays.length);

  return remainingCount / remainingShifts;
}

function hasBurstPattern(
  employeeId: string,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): boolean {
  const gaps = getShiftGaps(employeeId, cells, calendar);
  if (gaps.length < BURST_GAP_COUNT) return false;

  const lastGaps = gaps.slice(-BURST_GAP_COUNT);
  return lastGaps.every((gap) => gap <= TIGHT_GAP_THRESHOLD);
}

export function spacingScore(
  employee: ScheduleEmployee,
  day: CalendarDay,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
  context: SpacingContext,
): number {
  if (!needsRestBetweenShifts(employee.shiftType)) {
    return 0;
  }

  const effectiveSince = getEffectiveDaysSince(employee.id, day.day, cells);
  const ideal = getIdealGap(employee, day, cells, calendar, context);

  let score = Math.abs(effectiveSince - ideal);

  if (effectiveSince > LONG_GAP_THRESHOLD) {
    score += 40;
  }

  if (
    effectiveSince <= TIGHT_GAP_THRESHOLD &&
    hasBurstPattern(employee.id, cells, calendar)
  ) {
    score += 8;
  }

  return score;
}

export interface LongGapSlot {
  employee: ScheduleEmployee;
  afterDay: number;
  beforeDay: number;
  gapLength: number;
}

export function findLongGaps(
  employee: ScheduleEmployee,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): LongGapSlot[] {
  const days = getShiftDays(employee.id, cells, calendar);
  const slots: LongGapSlot[] = [];

  for (let i = 1; i < days.length; i++) {
    const gapLength = days[i] - days[i - 1];
    if (gapLength >= LONG_GAP_THRESHOLD) {
      slots.push({
        employee,
        afterDay: days[i - 1],
        beforeDay: days[i],
        gapLength,
      });
    }
  }

  return slots;
}

export function findGapFillDays(
  slot: LongGapSlot,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): CalendarDay[] {
  const days: CalendarDay[] = [];

  for (const day of calendar) {
    if (day.day <= slot.afterDay || day.day >= slot.beforeDay) continue;
    if (cells[slot.employee.id]?.[day.day] != null) continue;
    if (canAssign(slot.employee, day, cells)) {
      days.push(day);
    }
  }

  return days;
}

export function hasDenseShift(
  employeeId: string,
  shiftDay: number,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): boolean {
  const gaps = getShiftGaps(employeeId, cells, calendar);
  const days = getShiftDays(employeeId, cells, calendar);
  const index = days.indexOf(shiftDay);
  if (index === -1) return false;

  const prevGap = index > 0 ? gaps[index - 1] : null;
  const nextGap = index < gaps.length ? gaps[index] : null;

  return (
    (prevGap != null && prevGap <= TIGHT_GAP_THRESHOLD) ||
    (nextGap != null && nextGap <= TIGHT_GAP_THRESHOLD)
  );
}

export function improvesSpacing(
  employees: ScheduleEmployee[],
  cells: Schedule["cells"],
  calendar: CalendarDay[],
  beforeMaxGap: number,
  beforeVariance: number,
): boolean {
  const afterMaxGap = getPoolMaxGap(employees, cells, calendar);
  const afterVariance = getPoolGapVariance(employees, cells, calendar);

  if (afterMaxGap < beforeMaxGap) return true;
  if (afterMaxGap === beforeMaxGap && afterVariance < beforeVariance) {
    return true;
  }

  return false;
}

export function getNightAvgGapSpread(
  employees: ScheduleEmployee[],
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): number {
  const nightLike = employees.filter(
    (e) => e.shiftType === "night" || e.shiftType === "aux",
  );
  if (nightLike.length === 0) return 0;

  const averages = nightLike.map((emp) =>
    getAverageGap(emp.id, cells, calendar),
  );
  return Math.max(...averages) - Math.min(...averages);
}

export function getNightMaxGap(
  employees: ScheduleEmployee[],
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): number {
  const nightLike = employees.filter(
    (e) => e.shiftType === "night" || e.shiftType === "aux",
  );
  return getPoolMaxGap(nightLike, cells, calendar);
}

export function isSpacingRecipientCandidate(
  employee: ScheduleEmployee,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): boolean {
  if (getMaxGap(employee.id, cells, calendar) >= LONG_GAP_THRESHOLD) {
    return true;
  }
  return findLongGaps(employee, cells, calendar).length > 0;
}

export function isSpacingDonorCandidate(
  employee: ScheduleEmployee,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): boolean {
  const shiftDays = getShiftDays(employee.id, cells, calendar);
  for (const dayNum of shiftDays) {
    if (hasDenseShift(employee.id, dayNum, cells, calendar)) {
      return true;
    }
  }
  return false;
}

export function getPoolAverageMaxGap(
  employees: ScheduleEmployee[],
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): number {
  if (employees.length === 0) return 0;
  const total = employees.reduce(
    (sum, emp) => sum + getMaxGap(emp.id, cells, calendar),
    0,
  );
  return total / employees.length;
}
