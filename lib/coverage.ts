import { shiftCoversDay, shiftCoversNight } from "@/lib/hours";
import type {
  CalendarDay,
  Schedule,
  ScheduleEmployee,
  ShiftType,
} from "@/lib/types";
import { SHIFT_TYPE_LABELS } from "@/lib/types";

export interface ShiftCoverageDiff {
  type: ShiftType;
  label: string;
  required: number;
  actual: number;
  diff: number;
}

export interface DayCoverageStatus {
  deficits: ShiftCoverageDiff[];
  surpluses: ShiftCoverageDiff[];
  items: ShiftCoverageDiff[];
}

export function countDayCoverageForDay(
  employees: ScheduleEmployee[],
  day: number,
  cells: Schedule["cells"],
): number {
  return employees.filter((employee) => {
    const hours = cells[employee.id]?.[day];
    return hours != null && shiftCoversDay(hours);
  }).length;
}

export function countNightCoverageForDay(
  employees: ScheduleEmployee[],
  day: number,
  cells: Schedule["cells"],
): number {
  return employees.filter((employee) => {
    const hours = cells[employee.id]?.[day];
    return hours != null && shiftCoversNight(hours, employee.shiftType);
  }).length;
}

function countDayCoverage(schedule: Schedule, day: number): number {
  return countDayCoverageForDay(schedule.employees, day, schedule.cells);
}

function countNightCoverage(schedule: Schedule, day: number): number {
  return countNightCoverageForDay(schedule.employees, day, schedule.cells);
}

function buildDiff(
  type: ShiftType,
  required: number,
  actual: number,
): ShiftCoverageDiff | null {
  if (required <= 0) return null;

  const diff = actual - required;
  if (diff === 0) return null;

  return {
    type,
    label: SHIFT_TYPE_LABELS[type],
    required,
    actual,
    diff,
  };
}

export function getDayCoverageStatus(
  schedule: Schedule,
  calendarDay: CalendarDay,
): DayCoverageStatus {
  const { dayMin, nightMin } = schedule.coverage;
  const day = calendarDay.day;

  const checks: ShiftCoverageDiff[] = [];

  if (calendarDay.isWorkingDay) {
    const dayDiff = buildDiff("day", dayMin, countDayCoverage(schedule, day));
    if (dayDiff) checks.push(dayDiff);
  }

  const nightDiff = buildDiff(
    "night",
    nightMin,
    countNightCoverage(schedule, day),
  );
  if (nightDiff) checks.push(nightDiff);

  return {
    deficits: checks.filter((item) => item.diff < 0),
    surpluses: checks.filter((item) => item.diff > 0),
    items: checks,
  };
}

export function hasCoverageRequirements(schedule: Schedule): boolean {
  const { dayMin, nightMin } = schedule.coverage;
  return dayMin > 0 || nightMin > 0;
}

export function formatCoverageTooltip(status: DayCoverageStatus): string {
  if (status.items.length === 0) return "Покрытие в норме";

  return status.items
    .map(
      (item) =>
        `${item.label}: ${item.actual}/${item.required}${
          item.diff < 0
            ? ` (не хватает ${Math.abs(item.diff)})`
            : ` (лишних ${item.diff})`
        }`,
    )
    .join("; ");
}

export function formatCoverageCellText(status: DayCoverageStatus): string {
  if (status.items.length === 0) return "·";

  return status.items
    .map((item) => `${item.actual}/${item.required}`)
    .join("\n");
}
