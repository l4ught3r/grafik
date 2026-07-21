import { describe, expect, test } from "bun:test";
import {
  buildLockedCellKeys,
  isCellLocked,
  seedMonthPlan,
  setMonthPlanDay,
} from "@/lib/month-plan";
import type { ScheduleEmployee } from "@/lib/types";

describe("month-plan", () => {
  test("seedMonthPlan пишет часы и пропускает locked free", () => {
    const employees: ScheduleEmployee[] = [
      {
        id: "n1",
        name: "Ночь",
        shiftType: "night",
        vacations: [],
        monthPlan: { 1: 16.2, 2: null },
      },
    ];
    const cells: Record<string, Record<number, number | null>> = { n1: {} };
    seedMonthPlan(employees, cells);
    expect(cells.n1?.[1]).toBe(16.2);
    expect(cells.n1?.[2]).toBeUndefined();
  });

  test("buildLockedCellKeys включает null-дни", () => {
    const locked = buildLockedCellKeys([
      {
        id: "n1",
        name: "Ночь",
        shiftType: "night",
        vacations: [],
        monthPlan: { 3: null, 5: 24 },
      },
    ]);
    expect(isCellLocked(locked, "n1", 3)).toBe(true);
    expect(isCellLocked(locked, "n1", 5)).toBe(true);
    expect(isCellLocked(locked, "n1", 4)).toBe(false);
  });

  test("setMonthPlanDay удаляет ключ при undefined", () => {
    expect(setMonthPlanDay({ 1: 16.2 }, 1, undefined)).toBeUndefined();
    expect(setMonthPlanDay({ 1: 16.2, 2: null }, 1, undefined)).toEqual({
      2: null,
    });
  });
});
