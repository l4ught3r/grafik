import { describe, expect, test } from "bun:test";
import { getMonthCalendar } from "@/lib/calendar";
import {
  getPreHolidayDates,
  isHolidayYearSupported,
  isRussianPreHoliday,
  SUPPORTED_HOLIDAY_YEARS,
} from "@/lib/holidays/ru";
import { getShiftHours, SHIFT_HOURS } from "@/lib/hours";

describe("calendar pre-holidays", () => {
  test("getMonthCalendar возвращает тот же массив при повторном вызове", () => {
    const first = getMonthCalendar(2025, 4);
    const second = getMonthCalendar(2025, 4);
    expect(second).toBe(first);
  });

  test("2025-04-30 — предпраздничный перед 1 мая", () => {
    const calendar = getMonthCalendar(2025, 4);
    const day = calendar.find((d) => d.date === "2025-04-30");
    expect(day?.isPreHoliday).toBe(true);
    expect(day?.isWorkingDay).toBe(true);
  });

  test("выходной не помечается как предпраздничный", () => {
    const calendar = getMonthCalendar(2025, 5);
    const sundayBeforeHoliday = calendar.find((d) => d.date === "2025-05-04");
    expect(sundayBeforeHoliday?.isWeekend).toBe(true);
    expect(sundayBeforeHoliday?.isPreHoliday).toBe(false);
  });
});

describe("holidays ru", () => {
  test("SUPPORTED_HOLIDAY_YEARS включает 2028", () => {
    expect(SUPPORTED_HOLIDAY_YEARS).toContain(2028);
    expect(isHolidayYearSupported(2028)).toBe(true);
  });

  test("getPreHolidayDates возвращает отсортированный список", () => {
    const dates = getPreHolidayDates(2025);
    expect(dates.length).toBeGreaterThan(0);
    expect(isRussianPreHoliday(dates[0], 2025)).toBe(true);
  });
});

describe("getShiftHours pre-holiday", () => {
  test("дневная смена в предпраздничный день — 6.8 ч", () => {
    const calendar = getMonthCalendar(2025, 4);
    const preHoliday = calendar.find((d) => d.date === "2025-04-30");
    if (!preHoliday) throw new Error("expected pre-holiday day");
    expect(getShiftHours("day", preHoliday)).toBe(SHIFT_HOURS.dayPreHoliday);
    expect(SHIFT_HOURS.dayPreHoliday).toBe(SHIFT_HOURS.dayWeekday - 1);
  });
});
