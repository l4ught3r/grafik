import { describe, expect, test } from "bun:test";
import { getMonthCalendar } from "@/lib/calendar";
import { getDayCoverageStatus, hasCoverageRequirements } from "@/lib/coverage";
import { SHIFT_HOURS } from "@/lib/hours";
import type { Schedule } from "@/lib/types";

function createSchedule(
  cells: Schedule["cells"],
  coverage: Schedule["coverage"],
): Schedule {
  return {
    id: "test-schedule",
    departmentName: "Тест",
    month: 6,
    year: 2026,
    employees: [
      { id: "day1", name: "Сотрудник 1", shiftType: "day", vacations: [] },
      { id: "day2", name: "Сотрудник 2", shiftType: "day", vacations: [] },
      { id: "night1", name: "Сотрудник 3", shiftType: "night", vacations: [] },
      { id: "night2", name: "Сотрудник 4", shiftType: "night", vacations: [] },
    ],
    coverage,
    cells,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("hasCoverageRequirements", () => {
  test("false когда все минимумы равны нулю", () => {
    const schedule = createSchedule({}, { dayMin: 0, nightMin: 0 });
    expect(hasCoverageRequirements(schedule)).toBe(false);
  });

  test("true когда задан хотя бы один минимум", () => {
    const schedule = createSchedule({}, { dayMin: 1, nightMin: 0 });
    expect(hasCoverageRequirements(schedule)).toBe(true);
  });
});

describe("getDayCoverageStatus", () => {
  const workingDay = getMonthCalendar(2026, 6).find((day) => day.isWorkingDay);
  const weekendDay = getMonthCalendar(2026, 6).find((day) => day.isWeekend);

  test("показывает дефицит дневного покрытия", () => {
    if (!workingDay) throw new Error("expected working day");

    const schedule = createSchedule(
      { day1: { [workingDay.day]: SHIFT_HOURS.dayWeekday } },
      { dayMin: 2, nightMin: 0 },
    );

    const status = getDayCoverageStatus(schedule, workingDay);
    expect(status.deficits).toHaveLength(1);
    expect(status.deficits[0]?.type).toBe("day");
    expect(status.deficits[0]?.diff).toBe(-1);
  });

  test("не проверяет дневное покрытие в выходной", () => {
    if (!weekendDay) throw new Error("expected weekend day");

    const schedule = createSchedule({}, { dayMin: 2, nightMin: 0 });

    const status = getDayCoverageStatus(schedule, weekendDay);
    expect(status.deficits.some((item) => item.type === "day")).toBe(false);
  });

  test("показывает избыток ночного покрытия", () => {
    if (!workingDay) throw new Error("expected working day");

    const schedule = createSchedule(
      {
        night1: { [workingDay.day]: SHIFT_HOURS.nightWeekday },
        night2: { [workingDay.day]: SHIFT_HOURS.nightWeekday },
      },
      { dayMin: 0, nightMin: 1 },
    );

    const status = getDayCoverageStatus(schedule, workingDay);
    expect(status.surpluses.some((item) => item.type === "night")).toBe(true);
  });

  test("ночная смена (16.2) не засчитывается в дневное покрытие", () => {
    if (!workingDay) throw new Error("expected working day");

    const schedule: Schedule = {
      ...createSchedule(
        { shift1: { [workingDay.day]: SHIFT_HOURS.nightWeekday } },
        { dayMin: 1, nightMin: 1 },
      ),
      employees: [
        { id: "shift1", name: "Суточный", shiftType: "aux", vacations: [] },
      ],
    };

    const status = getDayCoverageStatus(schedule, workingDay);
    expect(status.deficits.some((item) => item.type === "day")).toBe(true);
    expect(status.deficits.some((item) => item.type === "night")).toBe(false);
  });

  test("суточный сотрудник засчитывается в день и ночь", () => {
    if (!workingDay) throw new Error("expected working day");

    const schedule: Schedule = {
      ...createSchedule(
        { shift1: { [workingDay.day]: 24 } },
        { dayMin: 1, nightMin: 1 },
      ),
      employees: [
        {
          id: "shift1",
          name: "Суточный",
          shiftType: "aux",
          vacations: [],
        },
      ],
    };

    const status = getDayCoverageStatus(schedule, workingDay);
    expect(status.items).toHaveLength(0);
  });

  test("суточный в выходной не влияет на день, но влияет на ночь", () => {
    if (!weekendDay) throw new Error("expected weekend day");

    const schedule: Schedule = {
      ...createSchedule(
        { shift1: { [weekendDay.day]: 24 } },
        { dayMin: 1, nightMin: 1 },
      ),
      employees: [
        {
          id: "shift1",
          name: "Суточный",
          shiftType: "aux",
          vacations: [],
        },
      ],
    };

    const status = getDayCoverageStatus(schedule, weekendDay);
    expect(status.deficits.some((item) => item.type === "day")).toBe(false);
    expect(status.items).toHaveLength(0);
  });
});
