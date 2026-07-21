import {
  assignShift,
  canAssign,
  daysSinceLastShift,
  getEmployeeHours,
} from "@/lib/assignment";
import { countDayCoverageForDay } from "@/lib/coverage";
import { SHIFT_HOURS, wouldExceedTargetHours } from "@/lib/hours";
import type {
  CalendarDay,
  Schedule,
  ScheduleEmployee,
  ScheduleSickDays,
} from "@/lib/types";

function countShift24Days(
  employeeId: string,
  cells: Schedule["cells"],
): number {
  const empCells = cells[employeeId] ?? {};
  return Object.values(empCells).filter(
    (hours) => hours === SHIFT_HOURS.shift24,
  ).length;
}

function wouldExceedAfterShift24(
  employee: ScheduleEmployee,
  cells: Schedule["cells"],
  year: number,
  month: number,
): boolean {
  return wouldExceedTargetHours(
    getEmployeeHours(employee.id, cells),
    SHIFT_HOURS.shift24,
    year,
    month,
  );
}

function sortAuxForShift24(
  auxEmployees: ScheduleEmployee[],
  day: CalendarDay,
  cells: Schedule["cells"],
  year: number,
  month: number,
  sickDays: ScheduleSickDays | undefined,
  lockedCells: Set<string> | undefined,
): ScheduleEmployee[] {
  return [...auxEmployees]
    .filter((employee) =>
      canAssign(employee, day, cells, sickDays, "shift24", lockedCells),
    )
    .sort((a, b) => {
      const exceedA = wouldExceedAfterShift24(a, cells, year, month);
      const exceedB = wouldExceedAfterShift24(b, cells, year, month);
      if (exceedA !== exceedB) return exceedA ? 1 : -1;

      const shift24Diff =
        countShift24Days(a.id, cells) - countShift24Days(b.id, cells);
      if (shift24Diff !== 0) return shift24Diff;

      const hoursDiff =
        getEmployeeHours(a.id, cells) - getEmployeeHours(b.id, cells);
      if (hoursDiff !== 0) return hoursDiff;

      return (
        daysSinceLastShift(b.id, day.day, cells) -
        daysSinceLastShift(a.id, day.day, cells)
      );
    });
}

/**
 * Закрывает дневной дефицит сутками (24 ч) с ротацией по пулу aux.
 */
export function assignAuxShift24ForDayGaps(
  employees: ScheduleEmployee[],
  auxEmployees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  dayMin: number,
  year: number,
  month: number,
  sickDays?: ScheduleSickDays,
  lockedCells?: Set<string>,
): void {
  if (dayMin <= 0 || auxEmployees.length === 0) return;

  const daysByDeficit = calendar
    .filter((day) => day.isWorkingDay)
    .map((day) => ({
      day,
      deficit: Math.max(
        0,
        dayMin - countDayCoverageForDay(employees, day.day, cells),
      ),
    }))
    .filter((item) => item.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit || a.day.day - b.day.day);

  for (const { day, deficit } of daysByDeficit) {
    let remaining = deficit;
    while (remaining > 0) {
      const candidates = sortAuxForShift24(
        auxEmployees,
        day,
        cells,
        year,
        month,
        sickDays,
        lockedCells,
      );
      if (candidates.length === 0) break;

      const picked = candidates[0];
      if (!assignShift(picked, day, cells, sickDays, "shift24", lockedCells)) {
        break;
      }
      remaining -= 1;
    }
  }
}
