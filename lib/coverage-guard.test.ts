import { describe, expect, test } from "bun:test";
import { getMonthCalendar } from "@/lib/calendar";
import {
  captureDayCoverageCounts,
  isCoveragePreserved,
  isCoveragePreservedFromCounts,
} from "@/lib/coverage-guard";
import type { ScheduleEmployee } from "@/lib/types";

const employees: ScheduleEmployee[] = [
  { id: "d1", name: "Дневной", shiftType: "day", vacations: [] },
  { id: "n1", name: "Ночной", shiftType: "night", vacations: [] },
];

describe("isCoveragePreserved", () => {
  const calendar = getMonthCalendar(2026, 6);
  const workingDay = calendar.find((day) => day.isWorkingDay);
  if (!workingDay) throw new Error("expected working day");

  test("разрешает улучшение дефицита", () => {
    const before = { d1: { [workingDay.day]: 7.8 } };
    const after = {
      d1: { [workingDay.day]: 7.8 },
      n1: { [workingDay.day]: 16.2 },
    };

    expect(
      isCoveragePreserved(employees, calendar, before, after, {
        dayMin: 1,
        nightMin: 1,
      }),
    ).toBe(true);
  });

  test("запрещает ухудшение закрытого дневного покрытия", () => {
    const before = {
      d1: { [workingDay.day]: 7.8 },
      d2: { [workingDay.day]: 7.8 },
    };
    const after = { d1: { [workingDay.day]: 7.8 } };

    expect(
      isCoveragePreserved(
        [
          ...employees,
          { id: "d2", name: "Дневной 2", shiftType: "day", vacations: [] },
        ],
        calendar,
        before,
        after,
        { dayMin: 2, nightMin: 0 },
      ),
    ).toBe(false);
  });

  test("запрещает создание избытка дневного покрытия", () => {
    const pool = [
      ...employees,
      { id: "d2", name: "Дневной 2", shiftType: "day" as const, vacations: [] },
      { id: "d3", name: "Дневной 3", shiftType: "day" as const, vacations: [] },
    ];
    const before = {
      d1: { [workingDay.day]: 7.8 },
      d2: { [workingDay.day]: 7.8 },
    };
    const after = {
      d1: { [workingDay.day]: 7.8 },
      d2: { [workingDay.day]: 7.8 },
      d3: { [workingDay.day]: 7.8 },
    };

    expect(
      isCoveragePreserved(pool, calendar, before, after, {
        dayMin: 2,
        nightMin: 0,
      }),
    ).toBe(false);
  });

  test("запрещает создание избытка ночного покрытия", () => {
    const pool = [
      ...employees,
      {
        id: "n2",
        name: "Ночной 2",
        shiftType: "night" as const,
        vacations: [],
      },
    ];
    const before = { n1: { [workingDay.day]: 16.2 } };
    const after = {
      n1: { [workingDay.day]: 16.2 },
      n2: { [workingDay.day]: 16.2 },
    };

    expect(
      isCoveragePreserved(pool, calendar, before, after, {
        dayMin: 0,
        nightMin: 1,
      }),
    ).toBe(false);
  });

  test("isCoveragePreservedFromCounts совпадает с полным снимком", () => {
    const before = {
      d1: { [workingDay.day]: 7.8 },
      d2: { [workingDay.day]: 7.8 },
    };
    const after = { d1: { [workingDay.day]: 7.8 } };
    const pool = [
      ...employees,
      { id: "d2", name: "Дневной 2", shiftType: "day" as const, vacations: [] },
    ];
    const beforeCounts = captureDayCoverageCounts(pool, [workingDay], before);

    expect(
      isCoveragePreservedFromCounts(pool, beforeCounts, after, {
        dayMin: 2,
        nightMin: 0,
      }),
    ).toBe(false);
  });
});
