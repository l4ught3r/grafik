import { describe, expect, test } from "bun:test";
import { getMonthCalendar } from "@/lib/calendar";
import { canSwapShifts } from "@/lib/swap";
import type { ScheduleEmployee } from "@/lib/types";

describe("swap", () => {
  test("canSwapShifts требует разные дни и заполненные ячейки", () => {
    const calendar = getMonthCalendar(2025, 4);
    const donor: ScheduleEmployee = {
      id: "a",
      name: "A",
      shiftType: "night",
      vacations: [],
    };
    const recipient: ScheduleEmployee = {
      id: "b",
      name: "B",
      shiftType: "night",
      vacations: [],
    };
    const cells = { a: { 5: 16.2 }, b: { 10: 16.2 } };
    const dayA = calendar.find((d) => d.day === 5);
    const dayB = calendar.find((d) => d.day === 10);
    if (!dayA || !dayB) throw new Error("expected calendar days");

    expect(canSwapShifts(donor, dayA, recipient, dayB, cells)).toBe(true);
  });
});
