import { assignShift, canAssign, removeShift } from "@/lib/assignment";
import {
  countDayCoverageForDay,
  countNightCoverageForDay,
} from "@/lib/coverage";
import { getShiftHours } from "@/lib/hours";
import type {
  CalendarDay,
  Schedule,
  ScheduleEmployee,
  ScheduleSickDays,
} from "@/lib/types";

export function countAuxDayNeedForDay(
  employees: ScheduleEmployee[],
  day: number,
  cells: Schedule["cells"],
  dayMin: number,
): number {
  return Math.max(0, dayMin - countDayCoverageForDay(employees, day, cells));
}

export function countAssignableAux(
  auxEmployees: ScheduleEmployee[],
  day: CalendarDay,
  cells: Schedule["cells"],
  sickDays?: ScheduleSickDays,
): number {
  return auxEmployees.filter((employee) =>
    canAssign(employee, day, cells, sickDays, "day"),
  ).length;
}

function getAssignableAux(
  auxEmployees: ScheduleEmployee[],
  day: CalendarDay,
  cells: Schedule["cells"],
  sickDays?: ScheduleSickDays,
): ScheduleEmployee[] {
  return auxEmployees.filter((employee) =>
    canAssign(employee, day, cells, sickDays, "day"),
  );
}

function simulateAuxAssignments(
  auxEmployees: ScheduleEmployee[],
  today: CalendarDay,
  cells: Schedule["cells"],
  assignCount: number,
): Schedule["cells"] {
  const candidates = getAssignableAux(auxEmployees, today, cells, undefined);
  const toAssign = candidates.slice(0, assignCount);
  if (toAssign.length === 0) return cells;

  const simulated: Schedule["cells"] = {};
  for (const [employeeId, days] of Object.entries(cells)) {
    simulated[employeeId] = { ...days };
  }

  for (const employee of toAssign) {
    const hours = getShiftHours(employee.shiftType, today, "day");
    if (hours == null) continue;
    if (!simulated[employee.id]) simulated[employee.id] = {};
    simulated[employee.id][today.day] = hours;
  }

  return simulated;
}

function scoreDayPairAfterTodayAssignment(
  employees: ScheduleEmployee[],
  day: CalendarDay,
  nextDay: CalendarDay,
  cells: Schedule["cells"],
  dayMin: number,
  auxEmployees: ScheduleEmployee[],
  sickDays?: ScheduleSickDays,
): number {
  const todayCoverage = countDayCoverageForDay(employees, day.day, cells);
  const todayDeficit = Math.max(0, dayMin - todayCoverage);

  const nextBaseCoverage = countDayCoverageForDay(
    employees,
    nextDay.day,
    cells,
  );
  const nextNeed = Math.max(0, dayMin - nextBaseCoverage);
  const nextAssignable = countAssignableAux(
    auxEmployees,
    nextDay,
    cells,
    sickDays,
  );
  const nextAchievable = nextBaseCoverage + Math.min(nextNeed, nextAssignable);
  const nextDeficit = Math.max(0, dayMin - nextAchievable);

  return todayDeficit + nextDeficit;
}

export function chooseAuxDayAssignCount(
  gap: number,
  day: CalendarDay,
  nextDay: CalendarDay | undefined,
  employees: ScheduleEmployee[],
  auxEmployees: ScheduleEmployee[],
  cells: Schedule["cells"],
  dayMin: number,
  sickDays?: ScheduleSickDays,
): number {
  if (gap <= 0) return 0;
  if (gap === 1) return 1;
  if (nextDay == null || !nextDay.isWorkingDay) return gap;

  const assignableToday = countAssignableAux(
    auxEmployees,
    day,
    cells,
    sickDays,
  );
  const fullAssign = Math.min(gap, assignableToday);
  if (fullAssign <= 0) return 0;
  if (fullAssign === 1) return 1;

  const fullCells = simulateAuxAssignments(
    auxEmployees,
    day,
    cells,
    fullAssign,
  );
  const partialCells = simulateAuxAssignments(
    auxEmployees,
    day,
    cells,
    fullAssign - 1,
  );

  const fullScore = scoreDayPairAfterTodayAssignment(
    employees,
    day,
    nextDay,
    fullCells,
    dayMin,
    auxEmployees,
    sickDays,
  );
  const partialScore = scoreDayPairAfterTodayAssignment(
    employees,
    day,
    nextDay,
    partialCells,
    dayMin,
    auxEmployees,
    sickDays,
  );

  if (partialScore < fullScore) {
    return Math.max(1, fullAssign - 1);
  }

  return fullAssign;
}

export function repairAuxDayCoverage(
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  dayMin: number,
  nightMin: number,
  auxEmployees: ScheduleEmployee[],
  sickDays?: ScheduleSickDays,
): void {
  if (dayMin <= 0 || auxEmployees.length === 0) return;

  for (const day of calendar) {
    if (!day.isWorkingDay) continue;

    const nextDay = calendar.find((item) => item.day === day.day + 1);
    if (nextDay == null || !nextDay.isWorkingDay) continue;

    const nextDeficit = countAuxDayNeedForDay(
      employees,
      nextDay.day,
      cells,
      dayMin,
    );
    if (nextDeficit <= 0) continue;

    for (const employee of auxEmployees) {
      if (cells[employee.id]?.[day.day] == null) continue;
      if (cells[employee.id]?.[nextDay.day] != null) continue;
      if (!canAssign(employee, nextDay, cells, sickDays, "day")) continue;

      removeShift(employee.id, day.day, cells);

      const dayCoverageAfterRemove = countDayCoverageForDay(
        employees,
        day.day,
        cells,
      );
      const nightCoverageAfterRemove = countNightCoverageForDay(
        employees,
        day.day,
        cells,
      );
      if (
        dayCoverageAfterRemove < dayMin ||
        (nightMin > 0 && nightCoverageAfterRemove < nightMin)
      ) {
        assignShift(employee, day, cells, sickDays, "day");
        continue;
      }

      if (!assignShift(employee, nextDay, cells, sickDays, "day")) {
        assignShift(employee, day, cells, sickDays, "day");
        continue;
      }

      const nextDayCoverage = countDayCoverageForDay(
        employees,
        nextDay.day,
        cells,
      );
      const nextNightCoverage = countNightCoverageForDay(
        employees,
        nextDay.day,
        cells,
      );
      if (
        nextDayCoverage < dayMin ||
        (nightMin > 0 && nextNightCoverage < nightMin)
      ) {
        removeShift(employee.id, nextDay.day, cells);
        assignShift(employee, day, cells, sickDays, "day");
        continue;
      }

      break;
    }
  }
}
