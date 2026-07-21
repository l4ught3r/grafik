import type { MonthPlan, Schedule, ScheduleEmployee } from "@/lib/types";

export function monthPlanCellKey(employeeId: string, day: number): string {
  return `${employeeId}:${day}`;
}

export function buildLockedCellKeys(
  employees: ScheduleEmployee[],
): Set<string> {
  const locked = new Set<string>();
  for (const employee of employees) {
    if (!employee.monthPlan) continue;
    for (const dayKey of Object.keys(employee.monthPlan)) {
      locked.add(monthPlanCellKey(employee.id, Number(dayKey)));
    }
  }
  return locked;
}

export function isCellLocked(
  lockedCells: Set<string> | undefined,
  employeeId: string,
  day: number,
): boolean {
  if (!lockedCells || lockedCells.size === 0) return false;
  return lockedCells.has(monthPlanCellKey(employeeId, day));
}

/** Записывает locked-смены в cells. Locked free (null) оставляет ячейку пустой. */
export function seedMonthPlan(
  employees: ScheduleEmployee[],
  cells: Schedule["cells"],
): void {
  for (const employee of employees) {
    if (!employee.monthPlan) continue;
    if (!cells[employee.id]) cells[employee.id] = {};

    for (const [dayKey, hours] of Object.entries(employee.monthPlan)) {
      const day = Number(dayKey);
      if (hours == null) continue;
      cells[employee.id][day] = hours;
    }
  }
}

export function countConfiguredMonthPlanDays(
  monthPlan: MonthPlan | undefined,
): number {
  if (!monthPlan) return 0;
  return Object.values(monthPlan).filter((hours) => hours != null).length;
}

export function setMonthPlanDay(
  monthPlan: MonthPlan | undefined,
  day: number,
  hours: number | null | undefined,
): MonthPlan | undefined {
  const next: MonthPlan = { ...(monthPlan ?? {}) };

  if (hours === undefined) {
    delete next[day];
  } else {
    next[day] = hours;
  }

  return Object.keys(next).length === 0 ? undefined : next;
}
