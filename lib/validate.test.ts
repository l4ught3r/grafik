import { describe, expect, test } from "bun:test";
import { isSchedule, isShiftType } from "@/lib/validate";

describe("validate", () => {
  test("isShiftType", () => {
    expect(isShiftType("day")).toBe(true);
    expect(isShiftType("invalid")).toBe(false);
  });

  test("isSchedule отклоняет неполный объект", () => {
    expect(isSchedule({ id: "1" })).toBe(false);
  });

  test("isSchedule отклоняет weekday 0 в dutyPreferences", () => {
    expect(
      isSchedule({
        id: "1",
        departmentName: "Test",
        month: 1,
        year: 2025,
        employees: [
          {
            id: "e1",
            name: "A",
            shiftType: "day",
            vacations: [],
            dutyPreferences: [{ weekday: 0, timesPerWeek: 1 }],
          },
        ],
        coverage: { dayMin: 0, nightMin: 0 },
        cells: {},
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  test("isSchedule принимает weekday 7 в dutyPreferences", () => {
    expect(
      isSchedule({
        id: "1",
        departmentName: "Test",
        month: 1,
        year: 2025,
        employees: [
          {
            id: "e1",
            name: "A",
            shiftType: "day",
            vacations: [],
            dutyPreferences: [{ weekday: 7, timesPerWeek: 1 }],
          },
        ],
        coverage: { dayMin: 0, nightMin: 0 },
        cells: {},
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  test("isSchedule принимает monthPlan у night", () => {
    expect(
      isSchedule({
        id: "1",
        departmentName: "Test",
        month: 1,
        year: 2025,
        employees: [
          {
            id: "e1",
            name: "A",
            shiftType: "night",
            vacations: [],
            monthPlan: { 1: 16.2, 2: null },
          },
        ],
        coverage: { dayMin: 0, nightMin: 0 },
        cells: {},
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  test("isSchedule принимает monthPlan с дневными часами", () => {
    expect(
      isSchedule({
        id: "1",
        departmentName: "Test",
        month: 1,
        year: 2025,
        employees: [
          {
            id: "e1",
            name: "A",
            shiftType: "day",
            vacations: [],
            monthPlan: { 1: 7.8, 2: 24 },
          },
        ],
        coverage: { dayMin: 0, nightMin: 0 },
        cells: {},
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  test("isSchedule отклоняет невалидные часы в monthPlan", () => {
    expect(
      isSchedule({
        id: "1",
        departmentName: "Test",
        month: 1,
        year: 2025,
        employees: [
          {
            id: "e1",
            name: "A",
            shiftType: "night",
            vacations: [],
            monthPlan: { 1: 9.9 },
          },
        ],
        coverage: { dayMin: 0, nightMin: 0 },
        cells: {},
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});
