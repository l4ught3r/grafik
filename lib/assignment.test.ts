import { describe, expect, test } from "bun:test";
import { canAssign, isDayFree } from "@/lib/assignment";
import { getMonthCalendar } from "@/lib/calendar";
import type { ScheduleEmployee } from "@/lib/types";

const employee: ScheduleEmployee = {
  id: "e1",
  name: "Иванов",
  shiftType: "day",
  vacations: [],
};

describe("assignment", () => {
  test("canAssign на рабочий день для дневной смены", () => {
    const calendar = getMonthCalendar(2025, 4);
    const workDay = calendar.find((d) => d.isWorkingDay);
    if (!workDay) throw new Error("expected working day");
    expect(canAssign(employee, workDay, {})).toBe(true);
  });

  test("isDayFree для пустой ячейки", () => {
    expect(isDayFree("e1", 5, {})).toBe(true);
  });
});
