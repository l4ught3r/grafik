import { assignShift, canAssign, removeShift } from "@/lib/assignment";
import {
  type CoverageMinimums,
  isCoveragePreserved,
  snapshotCells,
} from "@/lib/coverage-guard";
import { isCellLocked } from "@/lib/month-plan";
import {
  findGapFillDays,
  findLongGaps,
  getMaxGap,
  type LongGapSlot,
} from "@/lib/spacing";
import { canSwapShifts, executeSwap, revertSwap } from "@/lib/swap";
import type {
  CalendarDay,
  Schedule,
  ScheduleCoverage,
  ScheduleEmployee,
  ScheduleSickDays,
} from "@/lib/types";

const MAX_FILL_ITERATIONS = 20;

function restoreCells(
  cells: Schedule["cells"],
  snapshot: Schedule["cells"],
): void {
  for (const key of Object.keys(cells)) {
    delete cells[key];
  }
  for (const [employeeId, days] of Object.entries(snapshot)) {
    cells[employeeId] = { ...days };
  }
}

function sortFillDaysByGapCenter(
  fillDays: CalendarDay[],
  slot: LongGapSlot,
): CalendarDay[] {
  const center = (slot.afterDay + slot.beforeDay) / 2;
  return [...fillDays].sort(
    (a, b) => Math.abs(a.day - center) - Math.abs(b.day - center),
  );
}

function collectLongGapSlots(
  auxEmployees: ScheduleEmployee[],
  cells: Schedule["cells"],
  calendar: CalendarDay[],
  maxGap: number,
): LongGapSlot[] {
  const slots: LongGapSlot[] = [];

  for (const employee of auxEmployees) {
    for (const slot of findLongGaps(employee, cells, calendar)) {
      if (slot.gapLength >= maxGap) {
        slots.push(slot);
      }
    }
  }

  return slots.sort((a, b) => b.gapLength - a.gapLength);
}

function getCalendarDay(
  calendar: CalendarDay[],
  dayNumber: number,
): CalendarDay | undefined {
  return calendar.find((day) => day.day === dayNumber);
}

function tryMoveShift(
  employee: ScheduleEmployee,
  fromDay: CalendarDay,
  toDay: CalendarDay,
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  minimums: CoverageMinimums,
  sickDays?: ScheduleSickDays,
  lockedCells?: Set<string>,
): boolean {
  if (isCellLocked(lockedCells, employee.id, fromDay.day)) return false;
  if (isCellLocked(lockedCells, employee.id, toDay.day)) return false;
  if (cells[employee.id]?.[fromDay.day] == null) return false;
  if (!canAssign(employee, toDay, cells, sickDays, "night", lockedCells)) {
    return false;
  }

  const before = snapshotCells(cells);
  const hours = cells[employee.id]?.[fromDay.day];
  removeShift(employee.id, fromDay.day, cells, lockedCells);

  if (!isCoveragePreserved(employees, calendar, before, cells, minimums)) {
    restoreCells(cells, before);
    return false;
  }

  if (!cells[employee.id]) cells[employee.id] = {};
  if (hours == null) {
    restoreCells(cells, before);
    return false;
  }
  cells[employee.id][toDay.day] = hours;

  if (!isCoveragePreserved(employees, calendar, before, cells, minimums)) {
    restoreCells(cells, before);
    return false;
  }

  return true;
}

function tryAssignInGap(
  employee: ScheduleEmployee,
  day: CalendarDay,
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  minimums: CoverageMinimums,
  sickDays?: ScheduleSickDays,
  lockedCells?: Set<string>,
): boolean {
  if (isCellLocked(lockedCells, employee.id, day.day)) return false;
  const before = snapshotCells(cells);
  if (!assignShift(employee, day, cells, sickDays, "night", lockedCells)) {
    return false;
  }

  if (!isCoveragePreserved(employees, calendar, before, cells, minimums)) {
    restoreCells(cells, before);
    return false;
  }

  return true;
}

function tryMoveAndImproveGap(
  employee: ScheduleEmployee,
  fromDay: CalendarDay,
  toDay: CalendarDay,
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  minimums: CoverageMinimums,
  sickDays?: ScheduleSickDays,
  lockedCells?: Set<string>,
): boolean {
  const before = snapshotCells(cells);
  const beforeMaxGap = getMaxGap(employee.id, cells, calendar);

  if (
    !tryMoveShift(
      employee,
      fromDay,
      toDay,
      employees,
      calendar,
      cells,
      minimums,
      sickDays,
      lockedCells,
    )
  ) {
    return false;
  }

  const afterMaxGap = getMaxGap(employee.id, cells, calendar);
  if (afterMaxGap >= beforeMaxGap) {
    restoreCells(cells, before);
    return false;
  }

  return true;
}

function tryAssignAndImproveGap(
  employee: ScheduleEmployee,
  day: CalendarDay,
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  minimums: CoverageMinimums,
  sickDays?: ScheduleSickDays,
  lockedCells?: Set<string>,
): boolean {
  const before = snapshotCells(cells);
  const beforeMaxGap = getMaxGap(employee.id, cells, calendar);

  if (
    !tryAssignInGap(
      employee,
      day,
      employees,
      calendar,
      cells,
      minimums,
      sickDays,
      lockedCells,
    )
  ) {
    return false;
  }

  const afterMaxGap = getMaxGap(employee.id, cells, calendar);
  if (afterMaxGap >= beforeMaxGap) {
    restoreCells(cells, before);
    return false;
  }

  return true;
}

function tryTakeDonorShiftInGap(
  slot: LongGapSlot,
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  minimums: CoverageMinimums,
  sickDays?: ScheduleSickDays,
  lockedCells?: Set<string>,
): boolean {
  const recipient = slot.employee;
  const beforeMaxGap = getMaxGap(recipient.id, cells, calendar);
  const fillDays = sortFillDaysByGapCenter(
    findGapFillDays(slot, cells, calendar),
    slot,
  );

  for (const fillDay of fillDays) {
    if (cells[recipient.id]?.[fillDay.day] != null) continue;
    if (isCellLocked(lockedCells, recipient.id, fillDay.day)) continue;

    for (const donor of employees) {
      if (donor.id === recipient.id) continue;
      if (cells[donor.id]?.[fillDay.day] == null) continue;
      if (isCellLocked(lockedCells, donor.id, fillDay.day)) continue;

      const before = snapshotCells(cells);
      const donorHours = cells[donor.id]?.[fillDay.day];
      removeShift(donor.id, fillDay.day, cells, lockedCells);

      if (!isCoveragePreserved(employees, calendar, before, cells, minimums)) {
        restoreCells(cells, before);
        continue;
      }

      if (
        !assignShift(recipient, fillDay, cells, sickDays, "night", lockedCells)
      ) {
        restoreCells(cells, before);
        continue;
      }
      if (donorHours != null) {
        cells[recipient.id][fillDay.day] = donorHours;
      }

      if (!isCoveragePreserved(employees, calendar, before, cells, minimums)) {
        restoreCells(cells, before);
        continue;
      }

      const afterMaxGap = getMaxGap(recipient.id, cells, calendar);
      if (afterMaxGap < beforeMaxGap) {
        return true;
      }

      restoreCells(cells, before);
    }
  }

  return false;
}

function trySwapDonorFromGapMiddle(
  slot: LongGapSlot,
  auxEmployees: ScheduleEmployee[],
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  minimums: CoverageMinimums,
  lockedCells?: Set<string>,
): boolean {
  const recipient = slot.employee;
  const beforeMaxGap = getMaxGap(recipient.id, cells, calendar);
  const fillDays = sortFillDaysByGapCenter(
    findGapFillDays(slot, cells, calendar),
    slot,
  );
  const endpoints = [slot.afterDay, slot.beforeDay]
    .map((dayNumber) => getCalendarDay(calendar, dayNumber))
    .filter((day): day is CalendarDay => day != null);

  for (const fillDay of fillDays) {
    for (const donor of auxEmployees) {
      if (donor.id === recipient.id) continue;
      if (cells[donor.id]?.[fillDay.day] == null) continue;

      for (const endpoint of endpoints) {
        if (
          !canSwapShifts(
            donor,
            fillDay,
            recipient,
            endpoint,
            cells,
            lockedCells,
          )
        ) {
          continue;
        }

        const before = snapshotCells(cells);
        const snapshot = executeSwap(
          donor,
          fillDay,
          recipient,
          endpoint,
          auxEmployees,
          calendar,
          cells,
          lockedCells,
        );
        if (snapshot == null) continue;

        if (
          !isCoveragePreserved(employees, calendar, before, cells, minimums)
        ) {
          revertSwap(snapshot, cells);
          continue;
        }

        const afterMaxGap = getMaxGap(recipient.id, cells, calendar);
        if (afterMaxGap < beforeMaxGap) {
          return true;
        }

        revertSwap(snapshot, cells);
      }
    }
  }

  return false;
}

function tryFillSlot(
  slot: LongGapSlot,
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  minimums: CoverageMinimums,
  auxEmployees: ScheduleEmployee[],
  sickDays?: ScheduleSickDays,
  lockedCells?: Set<string>,
): boolean {
  const fillDays = sortFillDaysByGapCenter(
    findGapFillDays(slot, cells, calendar),
    slot,
  );

  const beforeDay = getCalendarDay(calendar, slot.beforeDay);
  if (beforeDay) {
    for (const toDay of fillDays) {
      if (
        tryMoveAndImproveGap(
          slot.employee,
          beforeDay,
          toDay,
          employees,
          calendar,
          cells,
          minimums,
          sickDays,
          lockedCells,
        )
      ) {
        return true;
      }
    }
  }

  const afterDay = getCalendarDay(calendar, slot.afterDay);
  if (afterDay) {
    for (const toDay of fillDays) {
      if (
        tryMoveAndImproveGap(
          slot.employee,
          afterDay,
          toDay,
          employees,
          calendar,
          cells,
          minimums,
          sickDays,
          lockedCells,
        )
      ) {
        return true;
      }
    }
  }

  for (const day of fillDays) {
    if (
      tryAssignAndImproveGap(
        slot.employee,
        day,
        employees,
        calendar,
        cells,
        minimums,
        sickDays,
        lockedCells,
      )
    ) {
      return true;
    }
  }

  if (
    tryTakeDonorShiftInGap(
      slot,
      employees,
      calendar,
      cells,
      minimums,
      sickDays,
      lockedCells,
    )
  ) {
    return true;
  }

  return trySwapDonorFromGapMiddle(
    slot,
    auxEmployees,
    employees,
    calendar,
    cells,
    minimums,
    lockedCells,
  );
}

export function fillAuxLongGaps(
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  coverage: ScheduleCoverage,
  sickDays?: ScheduleSickDays,
  maxGap = 4,
  lockedCells?: Set<string>,
): void {
  const auxEmployees = employees.filter(
    (employee) => employee.shiftType === "aux",
  );
  if (auxEmployees.length === 0) return;

  const minimums: CoverageMinimums = {
    dayMin: coverage.dayMin,
    nightMin: coverage.nightMin,
  };

  for (let iteration = 0; iteration < MAX_FILL_ITERATIONS; iteration++) {
    const slots = collectLongGapSlots(auxEmployees, cells, calendar, maxGap);
    if (slots.length === 0) break;

    let changed = false;
    for (const slot of slots) {
      if (
        tryFillSlot(
          slot,
          employees,
          calendar,
          cells,
          minimums,
          auxEmployees,
          sickDays,
          lockedCells,
        )
      ) {
        changed = true;
        break;
      }
    }

    if (!changed) break;
  }
}
