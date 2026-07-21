import { describe, expect, test } from "bun:test";
import { formatVacationsSummary } from "@/lib/vacation";

describe("vacation", () => {
  test("formatVacationsSummary для пустого списка", () => {
    expect(formatVacationsSummary([])).toEqual({
      label: "Отпуск",
      configured: false,
    });
  });
});
