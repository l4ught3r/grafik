import { describe, expect, test } from "bun:test";
import { DUTY_HOURS, isFlexibleDutyPreference } from "@/lib/duty";

describe("duty", () => {
  test("гибкое предпочтение — weekday null", () => {
    expect(isFlexibleDutyPreference({ weekday: null, timesPerWeek: 2 })).toBe(
      true,
    );
    expect(isFlexibleDutyPreference({ weekday: 1, timesPerWeek: 1 })).toBe(
      false,
    );
  });

  test("DUTY_HOURS равно 24", () => {
    expect(DUTY_HOURS).toBe(24);
  });
});
