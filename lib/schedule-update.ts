import { getMonthCalendar, isDateInVacation } from "@/lib/calendar";
import { setCellHours } from "@/lib/cells";
import { generateScheduleCells } from "@/lib/generator";
import {
  clearEmployeeSickDays,
  stripCellsOnSickDays,
  trimSickDaysToCalendar,
} from "@/lib/sick-days";
import type {
  CalendarDay,
  Schedule,
  ScheduleCoverage,
  ScheduleEmployee,
  VacationPeriod,
} from "@/lib/types";

export function clearEmployeeVacationDays(
  cells: Schedule["cells"],
  employeeId: string,
  calendar: CalendarDay[],
  vacations: VacationPeriod[],
): Schedule["cells"] {
  let next = cells;

  for (const day of calendar) {
    if (!isDateInVacation(day.date, vacations)) continue;
    if (cells[employeeId]?.[day.day] == null) continue;
    next = setCellHours(next, employeeId, day.day, null);
  }

  return next;
}

export function clearAllEmployeeCells(
  cells: Schedule["cells"],
  employeeId: string,
): Schedule["cells"] {
  if (!(employeeId in cells)) return cells;
  const { [employeeId]: _, ...rest } = cells;
  return rest;
}

function vacationsChanged(
  before: VacationPeriod[],
  after: VacationPeriod[],
): boolean {
  if (before.length !== after.length) return true;
  return after.some((vacation, index) => {
    const prev = before[index];
    return (
      !prev ||
      prev.from !== vacation.from ||
      prev.to !== vacation.to ||
      prev.id !== vacation.id
    );
  });
}

export function applyEmployeeChange(
  schedule: Schedule,
  index: number,
  updated: ScheduleEmployee,
): Schedule {
  const current = schedule.employees[index];
  if (!current) return schedule;

  let cells = schedule.cells;

  if (current.shiftType !== updated.shiftType) {
    cells = clearAllEmployeeCells(cells, current.id);
  } else if (vacationsChanged(current.vacations, updated.vacations)) {
    const calendar = getMonthCalendar(schedule.year, schedule.month);
    cells = clearEmployeeVacationDays(
      cells,
      current.id,
      calendar,
      updated.vacations,
    );
  }

  const employees = schedule.employees.map((employee, i) =>
    i === index ? updated : employee,
  );

  return { ...schedule, employees, cells };
}

export function removeScheduleEmployee(
  schedule: Schedule,
  index: number,
): Schedule {
  const employee = schedule.employees[index];
  if (!employee) return schedule;

  const employees = schedule.employees.filter((_, i) => i !== index);
  const cells = clearAllEmployeeCells(schedule.cells, employee.id);
  const sickDays = clearEmployeeSickDays(schedule.sickDays, employee.id);

  return { ...schedule, employees, cells, sickDays };
}

export function addScheduleEmployee(
  schedule: Schedule,
  employee: ScheduleEmployee,
): Schedule {
  return {
    ...schedule,
    employees: [...schedule.employees, employee],
    cells: { ...schedule.cells, [employee.id]: {} },
  };
}

export function regenerateSchedule(schedule: Schedule): Schedule {
  const cells = stripCellsOnSickDays(
    generateScheduleCells({
      year: schedule.year,
      month: schedule.month,
      employees: schedule.employees,
      coverage: schedule.coverage,
      sickDays: schedule.sickDays,
    }),
    schedule.sickDays,
  );

  return {
    ...schedule,
    cells,
    updatedAt: new Date().toISOString(),
  };
}

function trimCellsToCalendar(
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): Schedule["cells"] {
  const validDays = new Set(calendar.map((d) => d.day));
  let next = cells;

  for (const [employeeId, days] of Object.entries(cells)) {
    for (const dayKey of Object.keys(days)) {
      const day = Number(dayKey);
      if (!validDays.has(day)) {
        next = setCellHours(next, employeeId, day, null);
      }
    }
  }

  return next;
}

export function applyScheduleMetadata(
  schedule: Schedule,
  patch: {
    departmentName?: string;
    coverage?: ScheduleCoverage;
    sourceListId?: string;
  },
): Schedule {
  return {
    ...schedule,
    ...patch,
    coverage: patch.coverage ?? schedule.coverage,
    updatedAt: new Date().toISOString(),
  };
}

export function applySchedulePeriodChange(
  schedule: Schedule,
  month: number,
  year: number,
  options: { regenerate: boolean },
): Schedule {
  const calendar = getMonthCalendar(year, month);
  const cells = trimCellsToCalendar(schedule.cells, calendar);
  const sickDays = trimSickDaysToCalendar(schedule.sickDays, calendar);

  let next: Schedule = {
    ...schedule,
    month,
    year,
    cells,
    sickDays,
    updatedAt: new Date().toISOString(),
  };

  if (options.regenerate) {
    next = regenerateSchedule(next);
  }

  return next;
}
