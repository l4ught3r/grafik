import { describe, expect, test } from "bun:test";
import { getMonthCalendar } from "@/lib/calendar";
import {
  countDayCoverageForDay,
  countNightCoverageForDay,
} from "@/lib/coverage";
import { trimCoverageSurplus } from "@/lib/coverage-trim";
import { SHIFT_HOURS } from "@/lib/hours";
import type { ScheduleEmployee } from "@/lib/types";

describe("trimCoverageSurplus", () => {
  test("даунгрейдит aux 24 в дневные часы при night surplus", () => {
    const calendar = getMonthCalendar(2026, 6);
    const workingDay = calendar.find((day) => day.isWorkingDay);
    if (!workingDay) throw new Error("expected working day");

    const employees: ScheduleEmployee[] = [
      { id: "d1", name: "D1", shiftType: "day", vacations: [] },
      { id: "s1", name: "S1", shiftType: "aux", vacations: [] },
      { id: "s2", name: "S2", shiftType: "aux", vacations: [] },
    ];

    const cells = {
      d1: { [workingDay.day]: SHIFT_HOURS.dayWeekday },
      s1: { [workingDay.day]: SHIFT_HOURS.shift24 },
      s2: { [workingDay.day]: SHIFT_HOURS.shift24 },
    };

    // day=3 (d1+2aux24), night=2; dayMin=3 нельзя снять aux → даунгрейд
    trimCoverageSurplus(employees, [workingDay], cells, {
      dayMin: 3,
      nightMin: 1,
    });

    expect(
      countDayCoverageForDay(employees, workingDay.day, cells),
    ).toBeGreaterThanOrEqual(2);
    expect(countNightCoverageForDay(employees, workingDay.day, cells)).toBe(1);

    const auxHours = [cells.s1?.[workingDay.day], cells.s2?.[workingDay.day]];
    expect(auxHours.filter((h) => h === SHIFT_HOURS.shift24)).toHaveLength(1);
    expect(
      auxHours.some(
        (h) => h === SHIFT_HOURS.dayWeekday || h === SHIFT_HOURS.dayPreHoliday,
      ),
    ).toBe(true);
  });
});
