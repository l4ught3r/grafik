import {
  countDayCoverageForDay,
  countNightCoverageForDay,
} from "@/lib/coverage";
import type { CalendarDay, Schedule, ScheduleEmployee } from "@/lib/types";

export interface CoverageMinimums {
  dayMin: number;
  nightMin: number;
}

export interface DayCoverageCounts {
  day: number;
  isWorkingDay: boolean;
  dayCount: number;
  nightCount: number;
}

function cloneCells(cells: Schedule["cells"]): Schedule["cells"] {
  const next: Schedule["cells"] = {};
  for (const [employeeId, days] of Object.entries(cells)) {
    next[employeeId] = { ...days };
  }
  return next;
}

function meetsMinimum(
  previous: number,
  next: number,
  minimum: number,
): boolean {
  if (minimum <= 0) return true;
  if (previous >= minimum) return next >= minimum;
  return true;
}

function meetsMaximum(
  previous: number,
  next: number,
  maximum: number,
): boolean {
  if (maximum <= 0) return true;
  if (previous <= maximum) return next <= maximum;
  return true;
}

export function getOccupiedCalendarDays(
  employeeId: string,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): CalendarDay[] {
  const empCells = cells[employeeId];
  if (!empCells) return [];
  return calendar.filter((day) => empCells[day.day] != null);
}

export function captureDayCoverageCounts(
  employees: ScheduleEmployee[],
  days: CalendarDay[],
  cells: Schedule["cells"],
): DayCoverageCounts[] {
  return days.map((day) => ({
    day: day.day,
    isWorkingDay: day.isWorkingDay,
    dayCount: countDayCoverageForDay(employees, day.day, cells),
    nightCount: countNightCoverageForDay(employees, day.day, cells),
  }));
}

export function isCoveragePreservedFromCounts(
  employees: ScheduleEmployee[],
  before: DayCoverageCounts[],
  after: Schedule["cells"],
  minimums: CoverageMinimums,
): boolean {
  const { dayMin, nightMin } = minimums;
  if (dayMin <= 0 && nightMin <= 0) return true;

  for (const prev of before) {
    const nextDay = countDayCoverageForDay(employees, prev.day, after);
    const nextNight = countNightCoverageForDay(employees, prev.day, after);

    if (prev.isWorkingDay && !meetsMinimum(prev.dayCount, nextDay, dayMin)) {
      return false;
    }

    if (prev.isWorkingDay && !meetsMaximum(prev.dayCount, nextDay, dayMin)) {
      return false;
    }

    if (!meetsMinimum(prev.nightCount, nextNight, nightMin)) {
      return false;
    }

    if (!meetsMaximum(prev.nightCount, nextNight, nightMin)) {
      return false;
    }
  }

  return true;
}

export function isCoveragePreserved(
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  before: Schedule["cells"],
  after: Schedule["cells"],
  minimums: CoverageMinimums,
): boolean {
  const beforeCounts = captureDayCoverageCounts(employees, calendar, before);
  return isCoveragePreservedFromCounts(
    employees,
    beforeCounts,
    after,
    minimums,
  );
}

export function snapshotCells(cells: Schedule["cells"]): Schedule["cells"] {
  return cloneCells(cells);
}
