import { describe, expect, test } from "bun:test";
import { canAssign } from "@/lib/assignment";
import { getMonthCalendar } from "@/lib/calendar";
import {
  isSickDay,
  stripCellsOnSickDays,
  toggleSickDay,
} from "@/lib/sick-days";
import type { ScheduleEmployee } from "@/lib/types";

const employee: ScheduleEmployee = {
  id: "e1",
  name: "Иванов",
  shiftType: "day",
  vacations: [],
};

describe("sick-days", () => {
  test("toggleSickDay ставит и снимает больничный, очищая часы", () => {
    const cells = { e1: { 5: 7.8 } };
    const marked = toggleSickDay(cells, undefined, "e1", 5);

    expect(isSickDay(marked.sickDays, "e1", 5)).toBe(true);
    expect(marked.cells.e1?.[5]).toBeUndefined();

    const cleared = toggleSickDay(marked.cells, marked.sickDays, "e1", 5);
    expect(isSickDay(cleared.sickDays, "e1", 5)).toBe(false);
  });

  test("stripCellsOnSickDays очищает смены в дни больничного", () => {
    const cells = {
      e1: { 5: 7.8, 6: 16.2 },
      e2: { 5: 7.8 },
    };
    const sickDays = { e1: { 5: true as const } };

    const next = stripCellsOnSickDays(cells, sickDays);
    expect(next.e1?.[5]).toBeUndefined();
    expect(next.e1?.[6]).toBe(16.2);
    expect(next.e2?.[5]).toBe(7.8);
  });

  test("canAssign запрещает назначение в день больничного", () => {
    const calendar = getMonthCalendar(2025, 4);
    const workDay = calendar.find((d) => d.isWorkingDay);
    if (!workDay) throw new Error("expected working day");

    expect(
      canAssign(employee, workDay, {}, { e1: { [workDay.day]: true } }),
    ).toBe(false);
  });
});
