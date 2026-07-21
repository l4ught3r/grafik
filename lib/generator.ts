import { assignAuxShift24ForDayGaps } from "@/lib/assign-aux-24";
import {
  assignShift,
  canAssign,
  daysSinceLastShift,
  getEmployeeHours,
} from "@/lib/assignment";
import { balanceScheduleCells, balanceSpacing } from "@/lib/balance";
import { getMonthCalendar } from "@/lib/calendar";
import {
  countDayCoverageForDay,
  countNightCoverageForDay,
} from "@/lib/coverage";
import { trimCoverageSurplus } from "@/lib/coverage-trim";
import { assignDutyShifts } from "@/lib/duty";
import { fillAuxLongGaps } from "@/lib/fill-aux-gaps";
import { fillDayEmployeeWorkingDays } from "@/lib/fill-day-shifts";
import {
  getBaseRate,
  getShiftHours,
  getTargetHours,
  needsRateFloor,
  type ShiftMode,
  wouldExceedTargetHours,
} from "@/lib/hours";
import { buildLockedCellKeys, seedMonthPlan } from "@/lib/month-plan";
import { combineSeed, hashString, seededShuffle } from "@/lib/random";
import { type SpacingContext, spacingScore } from "@/lib/spacing";
import type {
  CalendarDay,
  Schedule,
  ScheduleCoverage,
  ScheduleEmployee,
  ScheduleSickDays,
  ShiftType,
} from "@/lib/types";

interface GeneratorInput {
  year: number;
  month: number;
  employees: ScheduleEmployee[];
  coverage: ScheduleCoverage;
  sickDays?: ScheduleSickDays;
}

function initCells(employees: ScheduleEmployee[]): Schedule["cells"] {
  const cells: Schedule["cells"] = {};
  for (const emp of employees) {
    cells[emp.id] = {};
  }
  return cells;
}

function canAssignWithinCap(
  employee: ScheduleEmployee,
  day: CalendarDay,
  cells: Schedule["cells"],
  year: number,
  month: number,
  sickDays?: ScheduleSickDays,
  mode: ShiftMode = "night",
  lockedCells?: Set<string>,
): boolean {
  if (!canAssign(employee, day, cells, sickDays, mode, lockedCells)) {
    return false;
  }

  const shiftHours = getShiftHours(employee.shiftType, day, mode);
  if (shiftHours == null) return false;

  const currentHours = getEmployeeHours(employee.id, cells);
  return !wouldExceedTargetHours(currentHours, shiftHours, year, month);
}

function sortCandidates(
  employees: ScheduleEmployee[],
  day: CalendarDay,
  cells: Schedule["cells"],
  year: number,
  month: number,
  spacingContext?: SpacingContext,
  candidatePool?: ShiftType,
): ScheduleEmployee[] {
  const baseRate = getBaseRate(year, month);
  const targetHours = getTargetHours(year, month);
  const seed = combineSeed(day.day, hashString(day.date));
  const shuffled = seededShuffle(employees, seed);
  const useSpacing = spacingContext != null;
  const fairAux = candidatePool === "aux";

  return shuffled.sort((a, b) => {
    const hoursA = getEmployeeHours(a.id, cells);
    const hoursB = getEmployeeHours(b.id, cells);

    if (fairAux && useSpacing) {
      const scoreA = spacingScore(
        a,
        day,
        cells,
        spacingContext.calendar,
        spacingContext,
      );
      const scoreB = spacingScore(
        b,
        day,
        cells,
        spacingContext.calendar,
        spacingContext,
      );
      const spacingDiff = scoreA - scoreB;
      if (spacingDiff !== 0) return spacingDiff;
    }

    if (fairAux) {
      const aboveA = hoursA > targetHours;
      const aboveB = hoursB > targetHours;
      if (aboveA !== aboveB) return aboveA ? 1 : -1;
    }

    if (needsRateFloor(a.shiftType) || needsRateFloor(b.shiftType)) {
      const belowA = hoursA < baseRate;
      const belowB = hoursB < baseRate;
      if (belowA !== belowB) return belowA ? -1 : 1;
    }

    const hoursDiff = hoursA - hoursB;
    if (hoursDiff !== 0) return hoursDiff;

    if (useSpacing) {
      const scoreA = spacingScore(
        a,
        day,
        cells,
        spacingContext.calendar,
        spacingContext,
      );
      const scoreB = spacingScore(
        b,
        day,
        cells,
        spacingContext.calendar,
        spacingContext,
      );
      const spacingDiff = scoreA - scoreB;
      if (spacingDiff !== 0) return spacingDiff;
    }

    const restDiff =
      daysSinceLastShift(b.id, day.day, cells) -
      daysSinceLastShift(a.id, day.day, cells);
    if (restDiff !== 0) return restDiff;

    return 0;
  });
}

function countAssignedOnDay(
  employees: ScheduleEmployee[],
  day: number,
  cells: Schedule["cells"],
): number {
  return employees.filter((emp) => cells[emp.id]?.[day] != null).length;
}

function pickDistributed(
  candidates: ScheduleEmployee[],
  count: number,
  day: CalendarDay,
): ScheduleEmployee[] {
  if (count <= 0 || candidates.length === 0) return [];
  if (candidates.length <= count) return candidates;

  const picked: ScheduleEmployee[] = [];
  const start = day.day % candidates.length;
  const step = candidates.length / count;

  for (let slot = 0; slot < count; slot++) {
    let index = Math.floor(start + slot * step) % candidates.length;

    for (let attempt = 0; attempt < candidates.length; attempt++) {
      const candidate = candidates[index];
      if (!picked.includes(candidate)) {
        picked.push(candidate);
        break;
      }
      index = (index + 1) % candidates.length;
    }
  }

  return picked;
}

function pickForDay(
  employees: ScheduleEmployee[],
  day: CalendarDay,
  cells: Schedule["cells"],
  count: number,
  year: number,
  month: number,
  spacingContext?: SpacingContext,
  sickDays?: ScheduleSickDays,
  candidatePool?: ShiftType,
  mode: ShiftMode = "night",
  lockedCells?: Set<string>,
): void {
  if (count <= 0 || employees.length === 0) return;

  const alreadyAssigned = countAssignedOnDay(employees, day.day, cells);
  const needed = count - alreadyAssigned;
  if (needed <= 0) return;

  const sorted = sortCandidates(
    employees,
    day,
    cells,
    year,
    month,
    spacingContext,
    candidatePool,
  );
  const allCandidates = sorted.filter((emp) =>
    canAssign(emp, day, cells, sickDays, mode, lockedCells),
  );
  const cappedCandidates = sorted.filter((emp) =>
    canAssignWithinCap(
      emp,
      day,
      cells,
      year,
      month,
      sickDays,
      mode,
      lockedCells,
    ),
  );
  const candidates =
    cappedCandidates.length >= needed ? cappedCandidates : allCandidates;

  const distributed = pickDistributed(candidates, needed, day);

  for (const emp of distributed) {
    assignShift(emp, day, cells, sickDays, mode, lockedCells);
  }
}

function pickToCloseCoverageGap(
  employees: ScheduleEmployee[],
  day: CalendarDay,
  cells: Schedule["cells"],
  currentCoverage: number,
  minimum: number,
  year: number,
  month: number,
  spacingContext?: SpacingContext,
  sickDays?: ScheduleSickDays,
  candidatePool?: ShiftType,
  maxAssign?: number,
  mode: ShiftMode = "night",
  lockedCells?: Set<string>,
): void {
  if (minimum <= 0) return;

  const gap = Math.max(0, minimum - currentCoverage);
  if (gap <= 0) return;

  const assignCount =
    maxAssign != null ? Math.min(gap, Math.max(0, maxAssign)) : gap;
  if (assignCount <= 0) return;

  const poolAssigned = countAssignedOnDay(employees, day.day, cells);
  pickForDay(
    employees,
    day,
    cells,
    poolAssigned + assignCount,
    year,
    month,
    spacingContext,
    sickDays,
    candidatePool,
    mode,
    lockedCells,
  );
}

function getEmployeesByType(
  employees: ScheduleEmployee[],
  type: ShiftType,
): ScheduleEmployee[] {
  return employees.filter((e) => e.shiftType === type);
}

/**
 * Генерирует ячейки графика. Мутирует внутренний объект cells in-place
 * во время pipeline (assignment, duty, balance). Возвращает новый объект —
 * НЕ передавайте schedule.cells из React state как вход.
 */
export function generateScheduleCells(
  input: GeneratorInput,
): Schedule["cells"] {
  const { year, month, employees, coverage, sickDays } = input;
  const calendar = getMonthCalendar(year, month);
  const cells = initCells(employees);
  const lockedCells = buildLockedCellKeys(employees);

  const dayEmployees = getEmployeesByType(employees, "day");
  const nightEmployees = getEmployeesByType(employees, "night");
  const auxEmployees = getEmployeesByType(employees, "aux");

  const nightSpacing: SpacingContext = {
    calendar,
    poolSize: nightEmployees.length,
    shiftsPerDay: coverage.nightMin,
  };
  const auxSpacing: SpacingContext = {
    calendar,
    poolSize: auxEmployees.length,
    shiftsPerDay: Math.max(coverage.dayMin, coverage.nightMin),
  };

  seedMonthPlan(employees, cells);
  assignDutyShifts(employees, calendar, cells, lockedCells);

  for (const day of calendar) {
    if (!day.isWorkingDay) continue;

    pickToCloseCoverageGap(
      dayEmployees,
      day,
      cells,
      countDayCoverageForDay(employees, day.day, cells),
      coverage.dayMin,
      year,
      month,
      undefined,
      sickDays,
      undefined,
      undefined,
      "day",
      lockedCells,
    );
  }

  assignAuxShift24ForDayGaps(
    employees,
    auxEmployees,
    calendar,
    cells,
    coverage.dayMin,
    year,
    month,
    sickDays,
    lockedCells,
  );

  for (const day of calendar) {
    pickToCloseCoverageGap(
      nightEmployees,
      day,
      cells,
      countNightCoverageForDay(employees, day.day, cells),
      coverage.nightMin,
      year,
      month,
      nightSpacing,
      sickDays,
      undefined,
      undefined,
      "night",
      lockedCells,
    );
  }

  for (const day of calendar) {
    pickToCloseCoverageGap(
      auxEmployees,
      day,
      cells,
      countNightCoverageForDay(employees, day.day, cells),
      coverage.nightMin,
      year,
      month,
      auxSpacing,
      sickDays,
      "aux",
      undefined,
      "night",
      lockedCells,
    );
  }

  trimCoverageSurplus(employees, calendar, cells, coverage, lockedCells);

  const coverageMinimums = {
    dayMin: coverage.dayMin,
    nightMin: coverage.nightMin,
  };

  const balanceInput = {
    year,
    month,
    employees,
    calendar,
    coverage: coverageMinimums,
    lockedCells,
  };

  balanceSpacing(balanceInput, cells);
  balanceScheduleCells(balanceInput, cells);

  fillAuxLongGaps(
    employees,
    calendar,
    cells,
    coverage,
    sickDays,
    4,
    lockedCells,
  );
  fillDayEmployeeWorkingDays(
    dayEmployees,
    calendar,
    cells,
    sickDays,
    lockedCells,
  );
  trimCoverageSurplus(employees, calendar, cells, coverage, lockedCells);
  fillAuxLongGaps(
    employees,
    calendar,
    cells,
    coverage,
    sickDays,
    4,
    lockedCells,
  );
  fillDayEmployeeWorkingDays(
    dayEmployees,
    calendar,
    cells,
    sickDays,
    lockedCells,
  );
  balanceSpacing(balanceInput, cells);
  trimCoverageSurplus(employees, calendar, cells, coverage, lockedCells);

  return cells;
}
