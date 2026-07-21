import { describe, expect, test } from "bun:test";
import { getMonthCalendar } from "@/lib/calendar";
import {
  countDayCoverageForDay,
  countNightCoverageForDay,
} from "@/lib/coverage";
import { fillAuxLongGaps } from "@/lib/fill-aux-gaps";
import { getMaxGap } from "@/lib/spacing";
import type { Schedule, ScheduleEmployee } from "@/lib/types";

function createAuxEmployee(id: string): ScheduleEmployee {
  return {
    id,
    name: `Вспомогательный ${id}`,
    shiftType: "aux",
    vacations: [],
    dutyPreferences: [],
  };
}

describe("fillAuxLongGaps", () => {
  const year = 2026;
  const month = 6;
  const calendar = getMonthCalendar(year, month);
  const coverage = { dayMin: 1, nightMin: 1 };

  test("сокращает разрыв 8 дней до max 4", () => {
    const employee = createAuxEmployee("s1");
    const cells: Schedule["cells"] = {
      s1: { 1: 24, 10: 24 },
    };

    fillAuxLongGaps([employee], calendar, cells, coverage);

    expect(getMaxGap("s1", cells, calendar)).toBeLessThanOrEqual(4);
  });

  test("не опускает покрытие ниже минимума, если оно было закрыто", () => {
    const employees = [createAuxEmployee("s1"), createAuxEmployee("s2")];
    const cells: Schedule["cells"] = {
      s1: { 1: 24, 12: 24 },
      s2: {},
    };
    for (const day of calendar) {
      cells.s2![day.day] = 24;
    }

    fillAuxLongGaps(employees, calendar, cells, { dayMin: 1, nightMin: 1 });

    for (const day of calendar) {
      if (day.isWorkingDay) {
        expect(
          countDayCoverageForDay(employees, day.day, cells),
        ).toBeGreaterThanOrEqual(1);
      }
      expect(
        countNightCoverageForDay(employees, day.day, cells),
      ).toBeGreaterThanOrEqual(1);
    }
  });
});
