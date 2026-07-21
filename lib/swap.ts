import { removeShift } from "@/lib/assignment";
import { isCellLocked } from "@/lib/month-plan";
import { getShiftGaps } from "@/lib/spacing";
import type { CalendarDay, Schedule, ScheduleEmployee } from "@/lib/types";

export interface SwapSnapshot {
  donorId: string;
  recipientId: string;
  dayA: number;
  dayB: number;
  hoursA: number;
  hoursB: number;
  poolCountsBefore: Map<number, number>;
}

function getPoolDayCounts(
  pool: ScheduleEmployee[],
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const day of calendar) {
    counts.set(
      day.day,
      pool.filter((emp) => cells[emp.id]?.[day.day] != null).length,
    );
  }
  return counts;
}

function hasNoConsecutiveShifts(
  employeeId: string,
  cells: Schedule["cells"],
  calendar: CalendarDay[],
): boolean {
  return !getShiftGaps(employeeId, cells, calendar).includes(1);
}

export function validatePoolSwap(
  pool: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  snapshot: SwapSnapshot,
): boolean {
  const countsAfter = getPoolDayCounts(pool, cells, calendar);
  for (const [day, countBefore] of snapshot.poolCountsBefore) {
    if (countsAfter.get(day) !== countBefore) return false;
  }

  if (!hasNoConsecutiveShifts(snapshot.donorId, cells, calendar)) {
    return false;
  }
  if (!hasNoConsecutiveShifts(snapshot.recipientId, cells, calendar)) {
    return false;
  }

  return true;
}

export function revertSwap(
  snapshot: SwapSnapshot,
  cells: Schedule["cells"],
): void {
  removeShift(snapshot.recipientId, snapshot.dayA, cells);
  removeShift(snapshot.donorId, snapshot.dayB, cells);

  if (!cells[snapshot.donorId]) cells[snapshot.donorId] = {};
  if (!cells[snapshot.recipientId]) cells[snapshot.recipientId] = {};
  cells[snapshot.donorId][snapshot.dayA] = snapshot.hoursA;
  cells[snapshot.recipientId][snapshot.dayB] = snapshot.hoursB;
}

export function canSwapShifts(
  donor: ScheduleEmployee,
  dayA: CalendarDay,
  recipient: ScheduleEmployee,
  dayB: CalendarDay,
  cells: Schedule["cells"],
  lockedCells?: Set<string>,
): boolean {
  if (dayA.day === dayB.day) return false;
  if (isCellLocked(lockedCells, donor.id, dayA.day)) return false;
  if (isCellLocked(lockedCells, recipient.id, dayB.day)) return false;
  if (isCellLocked(lockedCells, recipient.id, dayA.day)) return false;
  if (isCellLocked(lockedCells, donor.id, dayB.day)) return false;
  if (cells[donor.id]?.[dayA.day] == null) return false;
  if (cells[recipient.id]?.[dayB.day] == null) return false;
  if (cells[recipient.id]?.[dayA.day] != null) return false;
  if (cells[donor.id]?.[dayB.day] != null) return false;
  return true;
}

export function executeSwap(
  donor: ScheduleEmployee,
  dayA: CalendarDay,
  recipient: ScheduleEmployee,
  dayB: CalendarDay,
  pool: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  lockedCells?: Set<string>,
): SwapSnapshot | null {
  if (!canSwapShifts(donor, dayA, recipient, dayB, cells, lockedCells)) {
    return null;
  }

  const hoursA = cells[donor.id]?.[dayA.day];
  const hoursB = cells[recipient.id]?.[dayB.day];
  if (hoursA == null || hoursB == null) return null;

  const snapshot: SwapSnapshot = {
    donorId: donor.id,
    recipientId: recipient.id,
    dayA: dayA.day,
    dayB: dayB.day,
    hoursA,
    hoursB,
    poolCountsBefore: getPoolDayCounts(pool, cells, calendar),
  };

  removeShift(donor.id, dayA.day, cells, lockedCells);
  removeShift(recipient.id, dayB.day, cells, lockedCells);

  if (!cells[recipient.id]) cells[recipient.id] = {};
  if (!cells[donor.id]) cells[donor.id] = {};
  cells[recipient.id][dayA.day] = hoursA;
  cells[donor.id][dayB.day] = hoursB;

  if (!validatePoolSwap(pool, calendar, cells, snapshot)) {
    revertSwap(snapshot, cells);
    return null;
  }

  return snapshot;
}
