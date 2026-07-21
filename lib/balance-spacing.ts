import {
  type BalanceInput,
  getSpacingPools,
  MAX_BALANCE_ITERATIONS,
  preservesCoverageFromCounts,
} from "@/lib/balance-pools";
import {
  type CoverageMinimums,
  captureDayCoverageCounts,
  getOccupiedCalendarDays,
} from "@/lib/coverage-guard";
import {
  getMaxGap,
  getPoolAverageMaxGap,
  getPoolGapVariance,
  getPoolMaxGap,
  improvesSpacing,
  isSpacingDonorCandidate,
  isSpacingRecipientCandidate,
} from "@/lib/spacing";
import { canSwapShifts, executeSwap, revertSwap } from "@/lib/swap";
import type { CalendarDay, Schedule, ScheduleEmployee } from "@/lib/types";

function getSpacingDonors(
  employees: ScheduleEmployee[],
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): ScheduleEmployee[] {
  const avgMaxGap = getPoolAverageMaxGap(employees, cells, calendar);

  return employees.filter(
    (emp) =>
      isSpacingDonorCandidate(emp, cells, calendar) ||
      getMaxGap(emp.id, cells, calendar) > avgMaxGap,
  );
}

function getSpacingRecipients(
  employees: ScheduleEmployee[],
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): ScheduleEmployee[] {
  return employees.filter((emp) =>
    isSpacingRecipientCandidate(emp, cells, calendar),
  );
}

function trySpacingSwap(
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  coverage: CoverageMinimums | undefined,
  coverageEmployees: ScheduleEmployee[],
  lockedCells?: Set<string>,
): boolean {
  const beforeMaxGap = getPoolMaxGap(employees, cells, calendar);
  const beforeVariance = getPoolGapVariance(employees, cells, calendar);

  const donors = getSpacingDonors(employees, cells, calendar);
  const recipients = getSpacingRecipients(employees, cells, calendar);
  if (donors.length === 0 || recipients.length === 0) return false;

  for (const donor of donors) {
    for (const recipient of recipients) {
      if (donor.id === recipient.id) continue;

      const donorDays = getOccupiedCalendarDays(donor.id, cells, calendar);
      const recipientDays = getOccupiedCalendarDays(
        recipient.id,
        cells,
        calendar,
      );

      for (const dayA of donorDays) {
        for (const dayB of recipientDays) {
          if (
            !canSwapShifts(donor, dayA, recipient, dayB, cells, lockedCells)
          ) {
            continue;
          }

          const affectedDays = [dayA, dayB];
          const beforeCounts = coverage
            ? captureDayCoverageCounts(coverageEmployees, affectedDays, cells)
            : [];

          const snapshot = executeSwap(
            donor,
            dayA,
            recipient,
            dayB,
            employees,
            calendar,
            cells,
            lockedCells,
          );
          if (snapshot == null) continue;

          if (
            improvesSpacing(
              employees,
              cells,
              calendar,
              beforeMaxGap,
              beforeVariance,
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

function balanceSpacingPool(
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  coverage: CoverageMinimums | undefined,
  coverageEmployees: ScheduleEmployee[],
  lockedCells?: Set<string>,
): boolean {
  if (employees.length === 0) return false;
  return trySpacingSwap(
    employees,
    calendar,
    cells,
    coverage,
    coverageEmployees,
    lockedCells,
  );
}

/**
 * Балансирует разрывы между сменами. Мутирует cells in-place.
 */
export function balanceSpacing(
  input: BalanceInput,
  cells: Schedule["cells"],
): void {
  const { employees, calendar, coverage, lockedCells } = input;
  const pools = getSpacingPools(employees);

  for (let iteration = 0; iteration < MAX_BALANCE_ITERATIONS; iteration++) {
    let improved = false;

    for (const pool of pools) {
      if (
        balanceSpacingPool(
          pool,
          calendar,
          cells,
          coverage,
          employees,
          lockedCells,
        )
      ) {
        improved = true;
      }
    }

    if (!improved) break;
  }
}
