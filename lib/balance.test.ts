import { describe, expect, test } from "bun:test";
import { balanceScheduleCells } from "@/lib/balance";
import { getPools } from "@/lib/balance-pools";
import { getMonthCalendar } from "@/lib/calendar";
import {
  countDayCoverageForDay,
  countNightCoverageForDay,
  getDayCoverageStatus,
} from "@/lib/coverage";
import type { Schedule, ScheduleEmployee } from "@/lib/types";

describe("balance", () => {
  test("getPools объединяет ночных и вспомогательных в один пул по часам", () => {
    const employees: ScheduleEmployee[] = [
      { id: "d1", name: "День", shiftType: "day", vacations: [] },
      { id: "n1", name: "Ночь", shiftType: "night", vacations: [] },
      { id: "s1", name: "Вспом.", shiftType: "aux", vacations: [] },
    ];

    const pools = getPools(employees);

    expect(pools).toHaveLength(2);
    const floorPool = pools.find((pool) => pool.enforceFloor);
    expect(floorPool?.employees.map((e) => e.id).sort()).toEqual(["n1", "s1"]);

    const dayPool = pools.find((pool) => !pool.enforceFloor);
    expect(dayPool?.employees.map((e) => e.id)).toEqual(["d1"]);
  });

  test("balanceScheduleCells не бросает на минимальном вводе", () => {
    const employees: ScheduleEmployee[] = [
      {
        id: "n1",
        name: "Ночь 1",
        shiftType: "night",
        vacations: [],
      },
      {
        id: "n2",
        name: "Ночь 2",
        shiftType: "night",
        vacations: [],
      },
    ];
    const calendar = getMonthCalendar(2025, 4);
    const cells: Record<string, Record<number, number | null>> = {
      n1: { 1: 16.2 },
      n2: {},
    };

    balanceScheduleCells(
      {
        year: 2025,
        month: 4,
        employees,
        calendar,
      },
      cells,
    );

    expect(cells).toBeDefined();
  });

  test("после balance не появляется избыток покрытия", () => {
    const employees: ScheduleEmployee[] = [
      { id: "d1", name: "День 1", shiftType: "day", vacations: [] },
      { id: "d2", name: "День 2", shiftType: "day", vacations: [] },
      { id: "n1", name: "Ночь 1", shiftType: "night", vacations: [] },
      { id: "n2", name: "Ночь 2", shiftType: "night", vacations: [] },
    ];
    const calendar = getMonthCalendar(2026, 6);
    const workingDay = calendar.find((day) => day.isWorkingDay);
    if (!workingDay) throw new Error("expected working day");

    const cells: Schedule["cells"] = {
      d1: { [workingDay.day]: 7.8 },
      d2: { [workingDay.day]: 7.8 },
      n1: { [workingDay.day]: 16.2 },
      n2: { [workingDay.day]: 16.2 },
    };

    balanceScheduleCells(
      {
        year: 2026,
        month: 6,
        employees,
        calendar,
        coverage: { dayMin: 2, nightMin: 2 },
      },
      cells,
    );

    const schedule: Schedule = {
      id: "balance-test",
      departmentName: "Тест",
      month: 6,
      year: 2026,
      employees,
      coverage: { dayMin: 2, nightMin: 2 },
      cells,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const status = getDayCoverageStatus(schedule, workingDay);
    expect(status.surpluses).toHaveLength(0);
    expect(
      countDayCoverageForDay(employees, workingDay.day, cells),
    ).toBeLessThanOrEqual(2);
    expect(
      countNightCoverageForDay(employees, workingDay.day, cells),
    ).toBeLessThanOrEqual(2);
  });
});
