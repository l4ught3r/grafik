import { describe, expect, test } from "bun:test";
import { getMonthCalendar } from "@/lib/calendar";
import {
  getBaseRate,
  getShiftHours,
  getTargetHours,
  HOURS_PER_RATE,
  SHIFT_HOURS,
  shiftCoversNight,
} from "@/lib/hours";

function expectedBaseRate(year: number, month: number): number {
  return getMonthCalendar(year, month).reduce<number>((sum, day) => {
    if (!day.isWorkingDay) return sum;
    if (day.isPreHoliday) return sum + SHIFT_HOURS.dayPreHoliday;
    return sum + HOURS_PER_RATE;
  }, 0);
}

describe("hours", () => {
  test("getBaseRate учитывает предпраздничные сокращённые дни", () => {
    expect(getBaseRate(2025, 4)).toBeCloseTo(expectedBaseRate(2025, 4), 5);
    const calendar = getMonthCalendar(2025, 4);
    const preHolidayWorking = calendar.filter(
      (d) => d.isWorkingDay && d.isPreHoliday,
    ).length;
    expect(preHolidayWorking).toBeGreaterThan(0);
    expect(getBaseRate(2025, 4)).toBeLessThan(
      calendar.filter((d) => d.isWorkingDay).length * HOURS_PER_RATE,
    );
  });

  test("getTargetHours = baseRate * 1.5", () => {
    const base = getBaseRate(2025, 4);
    expect(getTargetHours(2025, 4)).toBeCloseTo(base * 1.5, 5);
  });

  test("ночная смена в выходной — 24 ч", () => {
    const calendar = getMonthCalendar(2025, 4);
    const weekend = calendar.find((d) => d.isWeekend);
    if (!weekend) throw new Error("expected weekend day");
    expect(getShiftHours("night", weekend)).toBe(SHIFT_HOURS.nightWeekend);
  });

  test("ночная смена в предпраздничный день — 17.2 ч", () => {
    const calendar = getMonthCalendar(2025, 4);
    const preHoliday = calendar.find((d) => d.date === "2025-04-30");
    if (!preHoliday) throw new Error("expected pre-holiday day");
    expect(getShiftHours("night", preHoliday)).toBe(
      SHIFT_HOURS.nightPreHoliday,
    );
  });

  test("shiftCoversNight учитывает сутки 24ч для aux/night", () => {
    expect(shiftCoversNight(SHIFT_HOURS.shift24, "aux")).toBe(true);
    expect(shiftCoversNight(SHIFT_HOURS.shift24, "night")).toBe(true);
    expect(shiftCoversNight(SHIFT_HOURS.shift24, "day")).toBe(false);
  });
});
