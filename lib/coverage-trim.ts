import {
  countDayCoverageForDay,
  countNightCoverageForDay,
} from "@/lib/coverage";
import { getShiftHours, SHIFT_HOURS } from "@/lib/hours";
import { isCellLocked } from "@/lib/month-plan";
import type {
  CalendarDay,
  Schedule,
  ScheduleCoverage,
  ScheduleEmployee,
  ShiftType,
} from "@/lib/types";

function removeOneShiftOnDay(
  employees: ScheduleEmployee[],
  day: CalendarDay,
  cells: Schedule["cells"],
  isValid: (nextCells: Schedule["cells"]) => boolean,
  typePriority: ShiftType[],
  lockedCells?: Set<string>,
): boolean {
  const assigned = employees.filter(
    (employee) => cells[employee.id]?.[day.day] != null,
  );
  if (assigned.length === 0) return false;

  const ordered = [...assigned].sort((a, b) => {
    const indexA = typePriority.indexOf(a.shiftType);
    const indexB = typePriority.indexOf(b.shiftType);
    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
  });

  for (const employee of ordered) {
    if (cells[employee.id]?.[day.day] == null) continue;
    if (isCellLocked(lockedCells, employee.id, day.day)) continue;

    const nextCells: Schedule["cells"] = {};
    for (const [employeeId, days] of Object.entries(cells)) {
      nextCells[employeeId] = { ...days };
    }
    delete nextCells[employee.id]?.[day.day];
    if (Object.keys(nextCells[employee.id] ?? {}).length === 0) {
      delete nextCells[employee.id];
    }

    if (!isValid(nextCells)) continue;

    delete cells[employee.id]?.[day.day];
    if (Object.keys(cells[employee.id] ?? {}).length === 0) {
      delete cells[employee.id];
    }
    return true;
  }

  return false;
}

/**
 * Aux 24 → дневные часы: ночное покрытие падает, дневное сохраняется.
 * Помогает снять night surplus, когда удалить сутки нельзя из‑за dayMin.
 */
function tryDowngradeAux24ToDay(
  employees: ScheduleEmployee[],
  day: CalendarDay,
  cells: Schedule["cells"],
  dayMin: number,
  nightMin: number,
  lockedCells?: Set<string>,
): boolean {
  if (!day.isWorkingDay) return false;

  const dayHours = getShiftHours("day", day, "day");
  if (dayHours == null) return false;

  const candidates = employees.filter(
    (employee) =>
      employee.shiftType === "aux" &&
      cells[employee.id]?.[day.day] === SHIFT_HOURS.shift24 &&
      !isCellLocked(lockedCells, employee.id, day.day),
  );

  for (const employee of candidates) {
    const nextCells: Schedule["cells"] = {};
    for (const [employeeId, days] of Object.entries(cells)) {
      nextCells[employeeId] = { ...days };
    }
    nextCells[employee.id] = {
      ...nextCells[employee.id],
      [day.day]: dayHours,
    };

    const dayOk =
      countDayCoverageForDay(employees, day.day, nextCells) >= dayMin;
    const nightOk =
      countNightCoverageForDay(employees, day.day, nextCells) >= nightMin;
    const nightReduced =
      countNightCoverageForDay(employees, day.day, nextCells) <
      countNightCoverageForDay(employees, day.day, cells);

    if (!dayOk || !nightOk || !nightReduced) continue;

    cells[employee.id][day.day] = dayHours;
    return true;
  }

  return false;
}

export function trimCoverageSurplus(
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  coverage: ScheduleCoverage,
  lockedCells?: Set<string>,
): void {
  const { dayMin, nightMin } = coverage;
  if (dayMin <= 0 && nightMin <= 0) return;

  for (const day of calendar) {
    while (
      day.isWorkingDay &&
      dayMin > 0 &&
      countDayCoverageForDay(employees, day.day, cells) > dayMin
    ) {
      const removed = removeOneShiftOnDay(
        employees,
        day,
        cells,
        (nextCells) =>
          countDayCoverageForDay(employees, day.day, nextCells) >= dayMin &&
          countNightCoverageForDay(employees, day.day, nextCells) >= nightMin,
        ["aux", "night", "day"],
        lockedCells,
      );
      if (!removed) break;
    }

    let nightTrimGuard = 0;
    while (
      nightMin > 0 &&
      countNightCoverageForDay(employees, day.day, cells) > nightMin &&
      nightTrimGuard < 50
    ) {
      nightTrimGuard += 1;
      if (
        tryDowngradeAux24ToDay(
          employees,
          day,
          cells,
          dayMin,
          nightMin,
          lockedCells,
        )
      ) {
        continue;
      }

      const removed = removeOneShiftOnDay(
        employees,
        day,
        cells,
        (nextCells) =>
          (!day.isWorkingDay ||
            countDayCoverageForDay(employees, day.day, nextCells) >= dayMin) &&
          countNightCoverageForDay(employees, day.day, nextCells) >= nightMin,
        ["night", "aux", "day"],
        lockedCells,
      );
      if (!removed) break;
    }
  }
}
