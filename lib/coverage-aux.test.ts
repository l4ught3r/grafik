import { describe, expect, test } from "bun:test";
import { getMonthCalendar } from "@/lib/calendar";
import {
  chooseAuxDayAssignCount,
  countAssignableAux,
  countAuxDayNeedForDay,
} from "@/lib/coverage-aux";
import type { ScheduleEmployee } from "@/lib/types";

function createAux(id: string): ScheduleEmployee {
  return { id, name: id, shiftType: "aux", vacations: [] };
}

describe("countAuxDayNeedForDay", () => {
  test("возвращает дневной дефицит для дня", () => {
    const employees = [
      { id: "d1", name: "d1", shiftType: "day" as const, vacations: [] },
      createAux("s1"),
    ];
    const cells = { d1: { 1: 7.8 } };

    expect(countAuxDayNeedForDay(employees, 1, cells, 3)).toBe(2);
  });
});

describe("chooseAuxDayAssignCount", () => {
  const calendar = getMonthCalendar(2026, 6);
  const day = calendar.find((item) => item.day === 7);

  test("при gap 1 всегда назначает одного вспомогательного", () => {
    if (!day) throw new Error("expected day");

    const auxEmployees = [createAux("s0"), createAux("s1")];
    const employees = [
      { id: "d1", name: "d1", shiftType: "day" as const, vacations: [] },
      ...auxEmployees,
    ];

    expect(
      chooseAuxDayAssignCount(
        1,
        day,
        undefined,
        employees,
        auxEmployees,
        {},
        3,
      ),
    ).toBe(1);
  });

  test("назначает полный gap без соседнего дефицита", () => {
    if (!day) throw new Error("expected day");

    const auxEmployees = [createAux("s0"), createAux("s1")];
    const employees = [
      { id: "d1", name: "d1", shiftType: "day" as const, vacations: [] },
      ...auxEmployees,
    ];

    expect(
      chooseAuxDayAssignCount(
        2,
        day,
        undefined,
        employees,
        auxEmployees,
        {},
        3,
      ),
    ).toBe(2);
  });
});

describe("countAssignableAux", () => {
  test("не считает сотрудника с соседней сменой", () => {
    const calendar = getMonthCalendar(2026, 6);
    const day = calendar.find((item) => item.day === 8);
    if (!day) throw new Error("expected day");

    const employee = createAux("s0");
    const cells = { s0: { 7: 24 } };

    expect(countAssignableAux([employee], day, cells)).toBe(0);
  });
});
