import { assignShift, getEmployeeHours, removeShift } from "@/lib/assignment";
import {
  type BalancePool,
  getEmployeeHoursList,
  getOverloaded,
  getUnderloaded,
  preservesCoverageFromCounts,
} from "@/lib/balance-pools";
import {
  type CoverageMinimums,
  captureDayCoverageCounts,
  getOccupiedCalendarDays,
} from "@/lib/coverage-guard";
import {
  getBaseRate,
  getEmployeeMonthHours,
  getTargetHours,
  SHIFT_HOURS,
} from "@/lib/hours";
import { isCellLocked } from "@/lib/month-plan";
import { getShiftGaps } from "@/lib/spacing";
import { canSwapShifts, executeSwap, revertSwap } from "@/lib/swap";
import type { CalendarDay, Schedule, ScheduleEmployee } from "@/lib/types";

const HOUR_EQUALIZE_TOLERANCE = SHIFT_HOURS.nightWeekday;

function canDonateShift(
  donor: ScheduleEmployee,
  day: CalendarDay,
  cells: Schedule["cells"],
  baseRate: number,
  enforceFloor: boolean,
): boolean {
  const shiftHours = cells[donor.id]?.[day.day];
  if (shiftHours == null) return false;

  const donorHours = getEmployeeHours(donor.id, cells);
  if (enforceFloor && donorHours - shiftHours < baseRate) return false;

  return true;
}

function improvesTransfer(
  recipientBefore: number,
  recipientAfter: number,
  donorBefore: number,
  donorAfter: number,
  baseRate: number,
  enforceFloor: boolean,
): boolean {
  if (recipientAfter <= recipientBefore) return false;
  if (donorAfter >= donorBefore) return false;

  if (enforceFloor) {
    if (recipientBefore >= baseRate) return false;
    if (donorAfter < baseRate) return false;
  }

  return true;
}

function hasConsecutiveShifts(
  employeeId: string,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): boolean {
  return getShiftGaps(employeeId, cells, calendar).includes(1);
}

function tryTransferSameDay(
  pool: BalancePool,
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  year: number,
  month: number,
  coverage: CoverageMinimums | undefined,
  coverageEmployees: ScheduleEmployee[],
  lockedCells?: Set<string>,
): boolean {
  const baseRate = getBaseRate(year, month);
  const targetHours = getTargetHours(year, month);
  const list = getEmployeeHoursList(pool.employees, cells, calendar);
  const underloaded = getUnderloaded(
    list,
    baseRate,
    targetHours,
    pool.enforceFloor,
  );
  const overloaded = getOverloaded(
    list,
    baseRate,
    targetHours,
    pool.enforceFloor,
  );

  for (const recipient of underloaded) {
    for (const donor of overloaded) {
      if (recipient.employee.id === donor.employee.id) continue;

      const donorDays = getOccupiedCalendarDays(
        donor.employee.id,
        cells,
        calendar,
      );

      for (const day of donorDays) {
        if (cells[recipient.employee.id]?.[day.day] != null) continue;
        if (isCellLocked(lockedCells, donor.employee.id, day.day)) continue;
        if (isCellLocked(lockedCells, recipient.employee.id, day.day)) {
          continue;
        }
        if (
          !canDonateShift(
            donor.employee,
            day,
            cells,
            baseRate,
            pool.enforceFloor,
          )
        ) {
          continue;
        }

        const recipientBefore = recipient.hours;
        const donorBefore = donor.hours;
        const shiftHours = cells[donor.employee.id]?.[day.day];
        if (shiftHours == null) continue;

        const affectedDays = [day];
        const beforeCounts = coverage
          ? captureDayCoverageCounts(coverageEmployees, affectedDays, cells)
          : [];

        removeShift(donor.employee.id, day.day, cells, lockedCells);
        if (
          !assignShift(
            recipient.employee,
            day,
            cells,
            undefined,
            "night",
            lockedCells,
          )
        ) {
          cells[donor.employee.id][day.day] = shiftHours;
          continue;
        }

        // Preserve exact hours (сутки vs ночь) after transfer
        cells[recipient.employee.id][day.day] = shiftHours;

        if (
          hasConsecutiveShifts(recipient.employee.id, cells, calendar) ||
          hasConsecutiveShifts(donor.employee.id, cells, calendar)
        ) {
          removeShift(recipient.employee.id, day.day, cells, lockedCells);
          cells[donor.employee.id][day.day] = shiftHours;
          continue;
        }

        const recipientAfter = getEmployeeMonthHours(
          recipient.employee.id,
          cells,
          recipient.employee.vacations,
          calendar,
        );
        const donorAfter = getEmployeeMonthHours(
          donor.employee.id,
          cells,
          donor.employee.vacations,
          calendar,
        );

        if (
          improvesTransfer(
            recipientBefore,
            recipientAfter,
            donorBefore,
            donorAfter,
            baseRate,
            pool.enforceFloor,
          ) &&
          preservesCoverageFromCounts(
            coverageEmployees,
            beforeCounts,
            cells,
            coverage,
          )
        ) {
          return true;
        }

        removeShift(recipient.employee.id, day.day, cells, lockedCells);
        cells[donor.employee.id][day.day] = shiftHours;
      }
    }
  }

  return false;
}

function trySwapAcrossDays(
  pool: BalancePool,
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  year: number,
  month: number,
  coverage: CoverageMinimums | undefined,
  coverageEmployees: ScheduleEmployee[],
  lockedCells?: Set<string>,
): boolean {
  const baseRate = getBaseRate(year, month);
  const targetHours = getTargetHours(year, month);
  const list = getEmployeeHoursList(pool.employees, cells, calendar);
  const underloaded = getUnderloaded(
    list,
    baseRate,
    targetHours,
    pool.enforceFloor,
  );
  const overloaded = getOverloaded(
    list,
    baseRate,
    targetHours,
    pool.enforceFloor,
  );

  for (const recipient of underloaded) {
    for (const donor of overloaded) {
      if (recipient.employee.id === donor.employee.id) continue;

      const donorDays = getOccupiedCalendarDays(
        donor.employee.id,
        cells,
        calendar,
      );
      const recipientDays = getOccupiedCalendarDays(
        recipient.employee.id,
        cells,
        calendar,
      );

      for (const dayA of donorDays) {
        if (isCellLocked(lockedCells, donor.employee.id, dayA.day)) continue;
        if (
          !canDonateShift(
            donor.employee,
            dayA,
            cells,
            baseRate,
            pool.enforceFloor,
          )
        ) {
          continue;
        }

        for (const dayB of recipientDays) {
          if (
            !canSwapShifts(
              donor.employee,
              dayA,
              recipient.employee,
              dayB,
              cells,
              lockedCells,
            )
          ) {
            continue;
          }

          const recipientBefore = recipient.hours;
          const donorBefore = donor.hours;
          const affectedDays = [dayA, dayB];
          const beforeCounts = coverage
            ? captureDayCoverageCounts(coverageEmployees, affectedDays, cells)
            : [];

          const snapshot = executeSwap(
            donor.employee,
            dayA,
            recipient.employee,
            dayB,
            pool.employees,
            calendar,
            cells,
            lockedCells,
          );
          if (snapshot == null) continue;

          const recipientAfter = getEmployeeMonthHours(
            recipient.employee.id,
            cells,
            recipient.employee.vacations,
            calendar,
          );
          const donorAfter = getEmployeeMonthHours(
            donor.employee.id,
            cells,
            donor.employee.vacations,
            calendar,
          );

          if (
            improvesTransfer(
              recipientBefore,
              recipientAfter,
              donorBefore,
              donorAfter,
              baseRate,
              pool.enforceFloor,
            ) &&
            preservesCoverageFromCounts(
              coverageEmployees,
              beforeCounts,
              cells,
              coverage,
            )
          ) {
            return true;
          }

          revertSwap(snapshot, cells);
        }
      }
    }
  }

  return false;
}

function tryEqualizeHours(
  pool: BalancePool,
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  year: number,
  month: number,
  coverage: CoverageMinimums | undefined,
  coverageEmployees: ScheduleEmployee[],
  lockedCells?: Set<string>,
): boolean {
  const baseRate = getBaseRate(year, month);
  const list = getEmployeeHoursList(pool.employees, cells, calendar);
  if (list.length < 2) return false;

  const hours = list.map((item) => item.hours);
  const minHours = Math.min(...hours);
  const maxHours = Math.max(...hours);
  if (maxHours - minHours <= HOUR_EQUALIZE_TOLERANCE) return false;

  const lowest = list
    .filter((item) => item.hours === minHours)
    .sort((a, b) => a.employee.id.localeCompare(b.employee.id));
  const highest = list
    .filter((item) => item.hours === maxHours)
    .sort((a, b) => a.employee.id.localeCompare(b.employee.id));

  for (const recipient of lowest) {
    if (recipient.hours < baseRate) continue;

    for (const donor of highest) {
      if (recipient.employee.id === donor.employee.id) continue;

      const donorDays = getOccupiedCalendarDays(
        donor.employee.id,
        cells,
        calendar,
      );
      const recipientDays = getOccupiedCalendarDays(
        recipient.employee.id,
        cells,
        calendar,
      );

      for (const dayA of donorDays) {
        for (const dayB of recipientDays) {
          if (
            !canSwapShifts(
              donor.employee,
              dayA,
              recipient.employee,
              dayB,
              cells,
              lockedCells,
            )
          ) {
            continue;
          }

          const spreadBefore = donor.hours - recipient.hours;
          const affectedDays = [dayA, dayB];
          const beforeCounts = coverage
            ? captureDayCoverageCounts(coverageEmployees, affectedDays, cells)
            : [];

          const snapshot = executeSwap(
            donor.employee,
            dayA,
            recipient.employee,
            dayB,
            pool.employees,
            calendar,
            cells,
            lockedCells,
          );
          if (snapshot == null) continue;

          const recipientAfter = getEmployeeMonthHours(
            recipient.employee.id,
            cells,
            recipient.employee.vacations,
            calendar,
          );
          const donorAfter = getEmployeeMonthHours(
            donor.employee.id,
            cells,
            donor.employee.vacations,
            calendar,
          );
          const spreadAfter = donorAfter - recipientAfter;

          if (
            spreadAfter < spreadBefore &&
            recipientAfter >= baseRate &&
            donorAfter >= baseRate &&
            preservesCoverageFromCounts(
              coverageEmployees,
              beforeCounts,
              cells,
              coverage,
            )
          ) {
            return true;
          }

          revertSwap(snapshot, cells);
        }
      }
    }
  }

  return false;
}

export function balancePool(
  pool: BalancePool,
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  year: number,
  month: number,
  coverage: CoverageMinimums | undefined,
  coverageEmployees: ScheduleEmployee[] = pool.employees,
  lockedCells?: Set<string>,
): boolean {
  if (pool.employees.length === 0) return false;

  if (
    tryTransferSameDay(
      pool,
      calendar,
      cells,
      year,
      month,
      coverage,
      coverageEmployees,
      lockedCells,
    )
  ) {
    return true;
  }
  if (
    trySwapAcrossDays(
      pool,
      calendar,
      cells,
      year,
      month,
      coverage,
      coverageEmployees,
      lockedCells,
    )
  ) {
    return true;
  }
  if (
    tryEqualizeHours(
      pool,
      calendar,
      cells,
      year,
      month,
      coverage,
      coverageEmployees,
      lockedCells,
    )
  ) {
    return true;
  }

  return false;
}
