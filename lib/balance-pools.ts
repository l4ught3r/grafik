import {
  type CoverageMinimums,
  type DayCoverageCounts,
  isCoveragePreserved,
  isCoveragePreservedFromCounts,
} from "@/lib/coverage-guard";
import { getEmployeeMonthHours } from "@/lib/hours";
import type { CalendarDay, Schedule, ScheduleEmployee } from "@/lib/types";

export const MAX_BALANCE_ITERATIONS = 30;

export interface BalanceInput {
  year: number;
  month: number;
  employees: ScheduleEmployee[];
  calendar: CalendarDay[];
  coverage?: CoverageMinimums;
  lockedCells?: Set<string>;
}

export interface EmployeeHours {
  employee: ScheduleEmployee;
  hours: number;
}

export interface BalancePool {
  employees: ScheduleEmployee[];
  enforceFloor: boolean;
}

export function getPools(employees: ScheduleEmployee[]): BalancePool[] {
  return [
    {
      employees: employees.filter(
        (e) => e.shiftType === "night" || e.shiftType === "aux",
      ),
      enforceFloor: true,
    },
    {
      employees: employees.filter((e) => e.shiftType === "day"),
      enforceFloor: false,
    },
  ];
}

export function getSpacingPools(
  employees: ScheduleEmployee[],
): ScheduleEmployee[][] {
  return [
    employees.filter((e) => e.shiftType === "night"),
    employees.filter((e) => e.shiftType === "aux"),
  ];
}

export function preservesCoverage(
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  before: Schedule["cells"],
  after: Schedule["cells"],
  coverage?: CoverageMinimums,
  affectedDays?: CalendarDay[],
): boolean {
  if (!coverage) return true;
  return isCoveragePreserved(
    employees,
    affectedDays ?? calendar,
    before,
    after,
    coverage,
  );
}

export function preservesCoverageFromCounts(
  employees: ScheduleEmployee[],
  beforeCounts: DayCoverageCounts[],
  after: Schedule["cells"],
  coverage?: CoverageMinimums,
): boolean {
  if (!coverage) return true;
  return isCoveragePreservedFromCounts(
    employees,
    beforeCounts,
    after,
    coverage,
  );
}

export function getEmployeeHoursList(
  employees: ScheduleEmployee[],
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): EmployeeHours[] {
  return employees.map((employee) => ({
    employee,
    hours: getEmployeeMonthHours(
      employee.id,
      cells,
      employee.vacations,
      calendar,
    ),
  }));
}

export function getUnderloaded(
  list: EmployeeHours[],
  baseRate: number,
  targetHours: number,
  enforceFloor: boolean,
): EmployeeHours[] {
  return list
    .filter((item) =>
      enforceFloor ? item.hours < baseRate : item.hours < targetHours,
    )
    .sort((a, b) => a.hours - b.hours);
}

export function getOverloaded(
  list: EmployeeHours[],
  baseRate: number,
  targetHours: number,
  enforceFloor: boolean,
): EmployeeHours[] {
  return list
    .filter((item) =>
      enforceFloor
        ? item.hours > targetHours || item.hours > baseRate
        : item.hours > targetHours,
    )
    .sort((a, b) => b.hours - a.hours);
}
