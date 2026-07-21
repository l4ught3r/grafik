import { describe, expect, test } from "bun:test";
import {
  formatVacationSpanLabel,
  getVacationSpanForDay,
  getVacationSpanLength,
  getVacationSpansInMonth,
  isDayInVacation,
} from "@/lib/vacation-spans";

describe("vacation-spans", () => {
  test("сегмент полностью внутри месяца", () => {
    const spans = getVacationSpansInMonth(2025, 4, [
      { id: "v1", from: "2025-04-10", to: "2025-04-15" },
    ]);

    expect(spans).toEqual([
      {
        startDay: 10,
        endDay: 15,
        from: "2025-04-10",
        to: "2025-04-15",
      },
    ]);
  });

  test("сегмент начинается до месяца", () => {
    const spans = getVacationSpansInMonth(2025, 2, [
      { id: "v1", from: "2025-01-25", to: "2025-02-05" },
    ]);

    expect(spans).toEqual([
      {
        startDay: 1,
        endDay: 5,
        from: "2025-01-25",
        to: "2025-02-05",
      },
    ]);
  });

  test("несколько периодов в одном месяце", () => {
    const spans = getVacationSpansInMonth(2025, 4, [
      { id: "v1", from: "2025-04-03", to: "2025-04-05" },
      { id: "v2", from: "2025-04-20", to: "2025-04-22" },
    ]);

    expect(spans).toHaveLength(2);
    expect(spans[0]?.startDay).toBe(3);
    expect(spans[1]?.startDay).toBe(20);
  });

  test("getVacationSpanForDay и длина сегмента", () => {
    const spans = getVacationSpansInMonth(2025, 4, [
      { id: "v1", from: "2025-04-10", to: "2025-04-12" },
    ]);

    expect(isDayInVacation(9, spans)).toBe(false);
    expect(isDayInVacation(10, spans)).toBe(true);
    const span = getVacationSpanForDay(11, spans);
    expect(span?.startDay).toBe(10);
    if (!span) throw new Error("expected vacation span");
    expect(getVacationSpanLength(span)).toBe(3);
  });

  test("formatVacationSpanLabel", () => {
    expect(formatVacationSpanLabel("2025-04-10", "2025-04-15")).toBe(
      "Отпуск с 10.04 по 15.04",
    );
  });
});
