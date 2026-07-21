import { describe, expect, test } from "bun:test";
import { analyzeScheduleQuality } from "@/lib/schedule-quality";
import type { Schedule } from "@/lib/types";

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: "s1",
    departmentName: "ОАР",
    month: 4,
    year: 2025,
    employees: [
      {
        id: "e1",
        name: "Иванов",
        shiftType: "day",
        vacations: [],
      },
    ],
    coverage: { dayMin: 1, nightMin: 0 },
    cells: {},
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("analyzeScheduleQuality", () => {
  test("пустой график имеет дефициты покрытия", () => {
    const report = analyzeScheduleQuality(makeSchedule());
    expect(report.daysWithDeficit).toBeGreaterThan(0);
    expect(report.unresolvedCoverageDeficit).toBe(true);
    expect(report.hasIssues).toBe(true);
  });

  test("отмечает невозможное дневное покрытие при отпусках", () => {
    const calendarDay = "2025-04-01";
    const report = analyzeScheduleQuality(
      makeSchedule({
        employees: [
          {
            id: "d1",
            name: "День",
            shiftType: "day",
            vacations: [{ id: "v1", from: calendarDay, to: calendarDay }],
          },
        ],
        coverage: { dayMin: 2, nightMin: 0 },
      }),
    );

    expect(report.coverageFeasibility.impossibleDayCoverage).toBe(true);
    expect(report.coverageFeasibility.messages.length).toBeGreaterThan(0);
  });

  test("сотрудник с недобором без time-off попадает в «ниже ставки»", () => {
    const report = analyzeScheduleQuality(
      makeSchedule({
        employees: [{ id: "e1", name: "Иванов", shiftType: "day", vacations: [] }],
      }),
    );

    expect(report.employeesBelowRate.some((item) => item.id === "e1")).toBe(
      true,
    );
  });

  test("сотрудник в отпуске не попадает в «ниже ставки»", () => {
    const report = analyzeScheduleQuality(
      makeSchedule({
        employees: [
          {
            id: "e1",
            name: "Иванов",
            shiftType: "day",
            vacations: [{ id: "v1", from: "2025-04-01", to: "2025-04-15" }],
          },
        ],
      }),
    );

    expect(report.employeesBelowRate.some((item) => item.id === "e1")).toBe(
      false,
    );
  });

  test("сотрудник с больничным не попадает в «ниже ставки»", () => {
    const report = analyzeScheduleQuality(
      makeSchedule({
        employees: [{ id: "e1", name: "Иванов", shiftType: "day", vacations: [] }],
        sickDays: { e1: { 3: true } },
      }),
    );

    expect(report.employeesBelowRate.some((item) => item.id === "e1")).toBe(
      false,
    );
  });

  test("предупреждает о соседних днях с потребностью в 2+ суточных", () => {
    const report = analyzeScheduleQuality(
      makeSchedule({
        month: 7,
        year: 2025,
        employees: [
          ...Array.from({ length: 5 }, (_, index) => ({
            id: `d${index}`,
            name: `День ${index}`,
            shiftType: "day" as const,
            vacations: [],
          })),
          ...Array.from({ length: 3 }, (_, index) => ({
            id: `s${index}`,
            name: `Сутки ${index}`,
            shiftType: "aux" as const,
            vacations: [],
          })),
        ],
        coverage: { dayMin: 7, nightMin: 0 },
      }),
    );

    expect(
      report.coverageFeasibility.messages.some((message) =>
        message.includes("Подряд идущие рабочие дни"),
      ),
    ).toBe(true);
  });
});
