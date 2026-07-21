import { setCellHours } from "@/lib/cells";
import type { CalendarDay, Schedule, ScheduleSickDays } from "@/lib/types";

export function isSickDay(
  sickDays: ScheduleSickDays | undefined,
  employeeId: string,
  day: number,
): boolean {
  return sickDays?.[employeeId]?.[day] === true;
}

function cloneSickDays(
  sickDays: ScheduleSickDays | undefined,
): ScheduleSickDays {
  if (!sickDays) return {};
  const next: ScheduleSickDays = {};
  for (const [employeeId, days] of Object.entries(sickDays)) {
    next[employeeId] = { ...days };
  }
  return next;
}

export function setSickDay(
  sickDays: ScheduleSickDays | undefined,
  employeeId: string,
  day: number,
  sick: boolean,
): ScheduleSickDays {
  const next = cloneSickDays(sickDays);
  if (!sick) {
    if (!next[employeeId]?.[day]) return sickDays ?? {};
    const { [day]: _, ...restDays } = next[employeeId];
    if (Object.keys(restDays).length === 0) {
      const { [employeeId]: __, ...restEmployees } = next;
      return restEmployees;
    }
    next[employeeId] = restDays;
    return next;
  }

  next[employeeId] = { ...next[employeeId], [day]: true };
  return next;
}

export function toggleSickDay(
  cells: Schedule["cells"],
  sickDays: ScheduleSickDays | undefined,
  employeeId: string,
  day: number,
): { cells: Schedule["cells"]; sickDays: ScheduleSickDays } {
  const sick = isSickDay(sickDays, employeeId, day);
  const nextSick = setSickDay(sickDays, employeeId, day, !sick);
  const nextCells = sick ? cells : setCellHours(cells, employeeId, day, null);

  return { cells: nextCells, sickDays: nextSick };
}

export function clearSickDay(
  sickDays: ScheduleSickDays | undefined,
  employeeId: string,
  day: number,
): ScheduleSickDays {
  return setSickDay(sickDays, employeeId, day, false);
}

export function stripCellsOnSickDays(
  cells: Schedule["cells"],
  sickDays: ScheduleSickDays | undefined,
): Schedule["cells"] {
  if (!sickDays) return cells;

  let next = cells;
  for (const [employeeId, days] of Object.entries(sickDays)) {
    for (const dayKey of Object.keys(days)) {
      next = setCellHours(next, employeeId, Number(dayKey), null);
    }
  }
  return next;
}

export function clearEmployeeSickDays(
  sickDays: ScheduleSickDays | undefined,
  employeeId: string,
): ScheduleSickDays {
  if (!sickDays?.[employeeId]) return sickDays ?? {};
  const { [employeeId]: _, ...rest } = sickDays;
  return rest;
}

export function trimSickDaysToCalendar(
  sickDays: ScheduleSickDays | undefined,
  calendar: CalendarDay[],
): ScheduleSickDays {
  if (!sickDays) return {};

  const validDays = new Set(calendar.map((d) => d.day));
  let changed = false;
  const next: ScheduleSickDays = {};

  for (const [employeeId, days] of Object.entries(sickDays)) {
    const trimmed: Record<number, true> = {};
    for (const [dayKey, value] of Object.entries(days)) {
      const day = Number(dayKey);
      if (validDays.has(day)) {
        trimmed[day] = value;
      } else {
        changed = true;
      }
    }
    if (Object.keys(trimmed).length > 0) {
      next[employeeId] = trimmed;
    } else if (Object.keys(days).length > 0) {
      changed = true;
    }
  }

  return changed ? next : (sickDays ?? {});
}
