import { assignShift, canAssign, getEmployeeHours } from "@/lib/assignment";
import type {
  CalendarDay,
  Schedule,
  ScheduleEmployee,
  ScheduleSickDays,
} from "@/lib/types";

export function fillDayEmployeeWorkingDays(
  employees: ScheduleEmployee[],
  calendar: CalendarDay[],
  cells: Schedule["cells"],
  sickDays?: ScheduleSickDays,
  lockedCells?: Set<string>,
): void {
  const dayEmployees = employees
    .filter((employee) => employee.shiftType === "day")
    .sort(
      (a, b) => getEmployeeHours(a.id, cells) - getEmployeeHours(b.id, cells),
    );

  for (const employee of dayEmployees) {
    for (const day of calendar) {
      if (!day.isWorkingDay) continue;
      if (!canAssign(employee, day, cells, sickDays, "day", lockedCells)) {
        continue;
      }
      assignShift(employee, day, cells, sickDays, "day", lockedCells);
    }
  }
}
