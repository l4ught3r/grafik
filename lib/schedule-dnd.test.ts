import { describe, expect, test } from "bun:test";
import {
  canDropShift,
  parseScheduleDragId,
  parseScheduleDropId,
  toScheduleDragId,
} from "@/lib/schedule-dnd";
import type { Schedule } from "@/lib/types";

const schedule: Schedule = {
  id: "s1",
  departmentName: "ОАР-2",
  month: 4,
  year: 2025,
  employees: [
    {
      id: "e1",
      name: "Иванов",
      shiftType: "day",
      vacations: [{ id: "v1", from: "2025-04-10", to: "2025-04-12" }],
    },
    {
      id: "e2",
      name: "Петров",
      shiftType: "day",
      vacations: [],
    },
  ],
  coverage: { dayMin: 1, nightMin: 0 },
  cells: {
    e1: { 5: 7.8 },
    e2: { 6: 7.8 },
  },
  sickDays: { e2: { 8: true } },
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("schedule-dnd", () => {
  test("toScheduleDragId и parseScheduleDragId", () => {
    const id = toScheduleDragId("emp-1", 15);
    expect(id).toBe("schedule-drag:emp-1:15");
    expect(parseScheduleDragId(id)).toEqual({ employeeId: "emp-1", day: 15 });
    expect(parseScheduleDropId("schedule-drop:emp-1:15")).toEqual({
      employeeId: "emp-1",
      day: 15,
    });
  });

  test("parseScheduleDragId поддерживает employeeId с двоеточием в id", () => {
    const id = toScheduleDragId("emp:complex", 3);
    expect(parseScheduleDragId(id)).toEqual({
      employeeId: "emp:complex",
      day: 3,
    });
  });

  test("canDropShift запрещает отпуск и больничный", () => {
    expect(
      canDropShift(
        { employeeId: "e1", day: 5 },
        { employeeId: "e1", day: 10 },
        schedule,
      ),
    ).toBe(false);
    expect(
      canDropShift(
        { employeeId: "e1", day: 5 },
        { employeeId: "e2", day: 8 },
        schedule,
      ),
    ).toBe(false);
  });

  test("canDropShift разрешает пустую рабочую ячейку", () => {
    expect(
      canDropShift(
        { employeeId: "e1", day: 5 },
        { employeeId: "e2", day: 6 },
        schedule,
      ),
    ).toBe(true);
    expect(
      canDropShift(
        { employeeId: "e1", day: 5 },
        { employeeId: "e1", day: 6 },
        schedule,
      ),
    ).toBe(true);
  });
});
