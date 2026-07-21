import { isDateInVacation } from "@/lib/calendar";
import { SHIFT_HOURS } from "@/lib/hours";
import { isCellLocked } from "@/lib/month-plan";
import { combineSeed, hashString, seededShuffle } from "@/lib/random";
import type {
  CalendarDay,
  DutyPreference,
  Schedule,
  ScheduleEmployee,
} from "@/lib/types";

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Понедельник", short: "Пн" },
  { value: 2, label: "Вторник", short: "Вт" },
  { value: 3, label: "Среда", short: "Ср" },
  { value: 4, label: "Четверг", short: "Чт" },
  { value: 5, label: "Пятница", short: "Пт" },
  { value: 6, label: "Суббота", short: "Сб" },
  { value: 7, label: "Воскресенье", short: "Вс" },
] as const;

export const DUTY_HOURS = SHIFT_HOURS.shift24;

export const MAX_DUTIES_PER_WEEK = 5;

export function isFlexibleDutyPreference(preference: DutyPreference): boolean {
  return preference.weekday === null;
}

export function getDutyCountPreference(
  preferences: DutyPreference[],
): DutyPreference | undefined {
  return preferences.find(isFlexibleDutyPreference);
}

export function getWeekday(calendarDay: CalendarDay): number {
  const day = new Date(`${calendarDay.date}T12:00:00`).getDay();
  return day === 0 ? 7 : day;
}

export function getWeekKey(date: string): string {
  const dateObj = new Date(`${date}T12:00:00`);
  const day = dateObj.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(dateObj);
  monday.setDate(dateObj.getDate() + diff);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(monday.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

export function groupCalendarByWeek(calendar: CalendarDay[]): CalendarDay[][] {
  const weeks = new Map<string, CalendarDay[]>();

  for (const day of calendar) {
    const key = getWeekKey(day.date);
    const week = weeks.get(key) ?? [];
    week.push(day);
    weeks.set(key, week);
  }

  return [...weeks.values()];
}

export function isDayDutyShift(
  employee: ScheduleEmployee,
  day: number,
  cells: Schedule["cells"],
): boolean {
  if (employee.shiftType !== "day") return false;
  return cells[employee.id]?.[day] === DUTY_HOURS;
}

export function countDayDutyOnDay(
  employees: ScheduleEmployee[],
  day: number,
  cells: Schedule["cells"],
): number {
  return employees.filter(
    (employee) =>
      employee.shiftType === "day" && cells[employee.id]?.[day] === DUTY_HOURS,
  ).length;
}

export function countDayDutyOnDayFromSchedule(
  schedule: Schedule,
  day: number,
): number {
  return countDayDutyOnDay(schedule.employees, day, schedule.cells);
}

function countDutyShifts(employeeId: string, cells: Schedule["cells"]): number {
  const empCells = cells[employeeId] ?? {};
  return Object.values(empCells).filter((hours) => hours === DUTY_HOURS).length;
}

/**
 * Мутирует cells in-place при назначении дежурств. См. assignShift.
 */
export function assignDutyShifts(
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  lockedCells?: Set<string>,
): void {
  const dayEmployees = employees.filter((e) => e.shiftType === "day");
  const weeks = groupCalendarByWeek(calendar);

  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const week = weeks[weekIndex];
    const weekSeed = combineSeed(weekIndex, hashString(week[0]?.date ?? ""));
    const sortedEmployees = seededShuffle(dayEmployees, weekSeed).sort(
      (a, b) => countDutyShifts(a.id, cells) - countDutyShifts(b.id, cells),
    );

    for (const employee of sortedEmployees) {
      const preferences = employee.dutyPreferences ?? [];
      if (preferences.length === 0) continue;

      for (const preference of preferences) {
        let assignedThisWeek = 0;
        const preferenceSeed =
          preference.weekday ?? hashString(`${employee.id}:flex`);
        const matchingDays = seededShuffle(
          week.filter((day) => {
            if (!day.isWorkingDay) return false;
            if (
              preference.weekday != null &&
              getWeekday(day) !== preference.weekday
            ) {
              return false;
            }
            if (isDateInVacation(day.date, employee.vacations)) return false;
            if (isCellLocked(lockedCells, employee.id, day.day)) return false;
            return cells[employee.id]?.[day.day] == null;
          }),
          combineSeed(weekSeed, hashString(employee.id), preferenceSeed),
        );

        for (const day of matchingDays) {
          if (assignedThisWeek >= preference.timesPerWeek) break;

          if (!cells[employee.id]) cells[employee.id] = {};
          cells[employee.id][day.day] = DUTY_HOURS;
          assignedThisWeek++;
        }
      }
    }
  }
}

export function createEmptyDutyPreference(): DutyPreference {
  return { weekday: 1, timesPerWeek: 1 };
}

export function createFlexibleDutyPreference(timesPerWeek = 1): DutyPreference {
  return { weekday: null, timesPerWeek };
}

export function getWeekdayLabel(weekday: number): string {
  return (
    WEEKDAY_OPTIONS.find((option) => option.value === weekday)?.label ?? ""
  );
}

export function formatDutyPreferencesSummary(preferences: DutyPreference[]): {
  label: string;
  configured: boolean;
} {
  const countPreference = getDutyCountPreference(preferences);
  if (countPreference) {
    return {
      label: `${countPreference.timesPerWeek}×/нед`,
      configured: true,
    };
  }

  const weekdays = preferences
    .filter((preference) => preference.weekday != null)
    .map(
      (preference) =>
        WEEKDAY_OPTIONS.find((option) => option.value === preference.weekday)
          ?.short,
    )
    .filter(Boolean);

  if (weekdays.length > 0) {
    return { label: weekdays.join(", "), configured: true };
  }

  return { label: "Дежурства", configured: false };
}
