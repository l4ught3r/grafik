import { isOnVacation } from "@/lib/assignment";
import { getMonthCalendar, isDateInVacation } from "@/lib/calendar";
import { getDayCoverageStatus, hasCoverageRequirements } from "@/lib/coverage";
import {
  getBaseRate,
  getEmployeeMonthHours,
  getTargetHours,
} from "@/lib/hours";
import type {
  CalendarDay,
  Schedule,
  ScheduleSickDays,
  VacationPeriod,
} from "@/lib/types";

export interface CoverageFeasibilityReport {
  impossibleDayCoverage: boolean;
  impossibleNightCoverage: boolean;
  daysWithImpossibleDay: number;
  daysWithImpossibleNight: number;
  messages: string[];
}

export interface EmployeeHoursIssue {
  id: string;
  name: string;
  hours: number;
  delta: number;
}

export interface ScheduleQualityReport {
  daysWithDeficit: number;
  daysWithSurplus: number;
  unresolvedCoverageDeficit: boolean;
  coverageFeasibility: CoverageFeasibilityReport;
  employeesBelowRate: EmployeeHoursIssue[];
  employeesAboveTarget: EmployeeHoursIssue[];
  hasIssues: boolean;
}

function hasTimeOffInMonth(
  employeeId: string,
  vacations: VacationPeriod[],
  sickDays: ScheduleSickDays | undefined,
  calendar: CalendarDay[],
): boolean {
  const onVacation = calendar.some((day) =>
    isDateInVacation(day.date, vacations),
  );
  if (onVacation) return true;
  const sick = sickDays?.[employeeId];
  return sick != null && Object.keys(sick).length > 0;
}

function countAvailableOnDay(
  schedule: Schedule,
  day: CalendarDay,
  shiftTypes: Schedule["employees"][number]["shiftType"][],
): number {
  return schedule.employees.filter(
    (employee) =>
      shiftTypes.includes(employee.shiftType) && !isOnVacation(employee, day),
  ).length;
}

export function analyzeCoverageFeasibility(
  schedule: Schedule,
): CoverageFeasibilityReport {
  const calendar = getMonthCalendar(schedule.year, schedule.month);
  const { dayMin, nightMin } = schedule.coverage;
  let daysWithImpossibleDay = 0;
  let daysWithImpossibleNight = 0;
  const messages: string[] = [];

  if (!hasCoverageRequirements(schedule)) {
    return {
      impossibleDayCoverage: false,
      impossibleNightCoverage: false,
      daysWithImpossibleDay: 0,
      daysWithImpossibleNight: 0,
      messages,
    };
  }

  for (const day of calendar) {
    if (day.isWorkingDay && dayMin > 0) {
      const maxDay = countAvailableOnDay(schedule, day, ["day", "aux"]);
      if (dayMin > maxDay) {
        daysWithImpossibleDay += 1;
      }
    }

    if (nightMin > 0) {
      const maxNight = countAvailableOnDay(schedule, day, ["night", "aux"]);
      if (nightMin > maxNight) {
        daysWithImpossibleNight += 1;
      }
    }
  }

  if (daysWithImpossibleDay > 0) {
    messages.push(
      `Дневное покрытие ${dayMin} невозможно в ${daysWithImpossibleDay} дн.: недостаточно свободных дневных и вспомогательных (отпуска).`,
    );
  }

  if (daysWithImpossibleNight > 0) {
    messages.push(
      `Ночное покрытие ${nightMin} невозможно в ${daysWithImpossibleNight} дн.: недостаточно свободных ночных и вспомогательных (отпуска).`,
    );
  }

  const auxPoolSize = schedule.employees.filter(
    (employee) => employee.shiftType === "aux",
  ).length;
  let consecutiveHighNeedDays = 0;

  if (dayMin > 0 && auxPoolSize > 0 && auxPoolSize <= 3) {
    for (let index = 0; index < calendar.length - 1; index++) {
      const day = calendar[index];
      const nextDay = calendar[index + 1];
      if (day == null || nextDay == null) continue;
      if (!day.isWorkingDay || !nextDay.isWorkingDay) continue;

      const dayNeed = Math.max(
        0,
        dayMin - countAvailableOnDay(schedule, day, ["day"]),
      );
      const nextNeed = Math.max(
        0,
        dayMin - countAvailableOnDay(schedule, nextDay, ["day"]),
      );

      if (dayNeed >= 2 && nextNeed >= 2) {
        consecutiveHighNeedDays += 1;
      }
    }
  }

  if (consecutiveHighNeedDays > 0) {
    messages.push(
      `Подряд идущие рабочие дни требуют по 2+ вспомогательных (${consecutiveHighNeedDays} пар): при правиле отдыха возможен дневной дефицит.`,
    );
  }

  return {
    impossibleDayCoverage: daysWithImpossibleDay > 0,
    impossibleNightCoverage: daysWithImpossibleNight > 0,
    daysWithImpossibleDay,
    daysWithImpossibleNight,
    messages,
  };
}

export function analyzeScheduleQuality(
  schedule: Schedule,
): ScheduleQualityReport {
  const calendar = getMonthCalendar(schedule.year, schedule.month);
  const baseRate = getBaseRate(schedule.year, schedule.month);
  const targetHours = getTargetHours(schedule.year, schedule.month);
  const coverageFeasibility = analyzeCoverageFeasibility(schedule);

  let daysWithDeficit = 0;
  let daysWithSurplus = 0;

  if (hasCoverageRequirements(schedule)) {
    for (const day of calendar) {
      const status = getDayCoverageStatus(schedule, day);
      if (status.deficits.length > 0) daysWithDeficit += 1;
      if (status.surpluses.length > 0) daysWithSurplus += 1;
    }
  }

  const employeesBelowRate: EmployeeHoursIssue[] = [];
  const employeesAboveTarget: EmployeeHoursIssue[] = [];

  for (const employee of schedule.employees) {
    const hours = getEmployeeMonthHours(
      employee.id,
      schedule.cells,
      employee.vacations,
      calendar,
    );

    if (
      hours < baseRate &&
      !hasTimeOffInMonth(
        employee.id,
        employee.vacations,
        schedule.sickDays,
        calendar,
      )
    ) {
      employeesBelowRate.push({
        id: employee.id,
        name: employee.name,
        hours,
        delta: baseRate - hours,
      });
    }

    if (hours > targetHours) {
      employeesAboveTarget.push({
        id: employee.id,
        name: employee.name,
        hours,
        delta: hours - targetHours,
      });
    }
  }

  return {
    daysWithDeficit,
    daysWithSurplus,
    unresolvedCoverageDeficit:
      hasCoverageRequirements(schedule) && daysWithDeficit > 0,
    coverageFeasibility,
    employeesBelowRate,
    employeesAboveTarget,
    hasIssues:
      daysWithDeficit > 0 ||
      daysWithSurplus > 0 ||
      coverageFeasibility.messages.length > 0 ||
      employeesBelowRate.length > 0 ||
      employeesAboveTarget.length > 0,
  };
}
