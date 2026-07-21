import { describe, expect, test } from "bun:test";
import { getMonthCalendar } from "@/lib/calendar";
import { getShiftGaps } from "@/lib/spacing";

describe("spacing", () => {
  test("getShiftGaps находит разрыв 1 день", () => {
    const calendar = getMonthCalendar(2025, 4);
    const cells = { e1: { 1: 7.8, 2: 7.8 } };
    const gaps = getShiftGaps("e1", cells, calendar);
    expect(gaps).toContain(1);
  });
});
