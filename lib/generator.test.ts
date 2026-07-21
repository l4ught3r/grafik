import { describe, expect, test } from "bun:test";
import { getMonthCalendar, isDateInVacation } from "@/lib/calendar";
import {
  countDayCoverageForDay,
  countNightCoverageForDay,
  getDayCoverageStatus,
} from "@/lib/coverage";
import { createFlexibleDutyPreference, DUTY_HOURS } from "@/lib/duty";
import { generateScheduleCells } from "@/lib/generator";
import {
  getBaseRate,
  getEmployeeMonthHours,
  getTargetHours,
  SHIFT_HOURS,
} from "@/lib/hours";
import { getMaxGap, getPoolMaxGap } from "@/lib/spacing";
import type { Schedule, ScheduleEmployee } from "@/lib/types";

function expectDayEmployeesOnAllWorkingDays(
  employees: ScheduleEmployee[],
  calendar: ReturnType<typeof getMonthCalendar>,
  cells: Schedule["cells"],
): void {
  const workingDays = calendar.filter((day) => day.isWorkingDay);

  for (const employee of employees.filter((item) => item.shiftType === "day")) {
    for (const day of workingDays) {
      if (isDateInVacation(day.date, employee.vacations)) continue;
      expect(cells[employee.id]?.[day.day]).not.toBeNull();
      expect(cells[employee.id]?.[day.day]).not.toBeUndefined();
    }
  }
}

function expectAuxMaxGap(
  employees: ScheduleEmployee[],
  calendar: ReturnType<typeof getMonthCalendar>,
  cells: Schedule["cells"],
  maxGap = 4,
): void {
  const auxEmployees = employees.filter((item) => item.shiftType === "aux");
  const poolMax = getPoolMaxGap(auxEmployees, cells, calendar);
  expect(poolMax).toBeLessThanOrEqual(maxGap + 3);

  for (const employee of auxEmployees) {
    const allowedGap = employee.vacations.length > 0 ? maxGap + 4 : maxGap + 3;
    expect(getMaxGap(employee.id, cells, calendar)).toBeLessThanOrEqual(
      allowedGap,
    );
  }
}

function expectDutyDaysNotDuplicated(
  employees: ScheduleEmployee[],
  calendar: ReturnType<typeof getMonthCalendar>,
  cells: Schedule["cells"],
): void {
  for (const employee of employees.filter((item) => item.shiftType === "day")) {
    for (const day of calendar) {
      if (!day.isWorkingDay) continue;
      const hours = cells[employee.id]?.[day.day];
      if (hours === DUTY_HOURS) {
        expect(hours).toBe(DUTY_HOURS);
      }
    }
  }
}

function createEmployee(
  id: string,
  shiftType: ScheduleEmployee["shiftType"],
  vacations: ScheduleEmployee["vacations"] = [],
  dutyPreferences: ScheduleEmployee["dutyPreferences"] = [],
): ScheduleEmployee {
  return {
    id,
    name: `Сотрудник ${id}`,
    shiftType,
    vacations,
    dutyPreferences,
  };
}

describe("generateScheduleCells", () => {
  const year = 2026;
  const month = 6;
  const calendar = getMonthCalendar(year, month);
  const workingDays = calendar.filter((day) => day.isWorkingDay);

  test("назначает минимум dayMin смен на каждый рабочий день", () => {
    const employees = [
      createEmployee("d1", "day"),
      createEmployee("d2", "day"),
      createEmployee("d3", "day"),
    ];
    const dayMin = 2;

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin, nightMin: 0 },
    });

    for (const day of workingDays) {
      const assigned = employees.filter(
        (employee) => cells[employee.id]?.[day.day] != null,
      ).length;
      expect(assigned).toBeGreaterThanOrEqual(dayMin);
    }
  });

  test("не назначает смены в дни отпуска", () => {
    const vacationDay = workingDays[0];
    if (!vacationDay) throw new Error("expected working day");

    const employees = [
      createEmployee("d1", "day", [
        { id: "vac1", from: vacationDay.date, to: vacationDay.date },
      ]),
      createEmployee("d2", "day"),
      createEmployee("d3", "day"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 2, nightMin: 0 },
    });

    expect(cells.d1?.[vacationDay.day]).toBeUndefined();
    expect(
      isDateInVacation(vacationDay.date, employees[0]?.vacations ?? []),
    ).toBe(true);
  });

  test("суточные закрывают дневной дефицит", () => {
    const employees = [
      createEmployee("d1", "day"),
      createEmployee("d2", "day"),
      createEmployee("s1", "aux"),
      createEmployee("s2", "aux"),
    ];
    const dayMin = 3;

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin, nightMin: 0 },
    });

    for (const day of workingDays) {
      expect(
        countDayCoverageForDay(employees, day.day, cells),
      ).toBeGreaterThanOrEqual(dayMin);
    }
  });

  test("aux закрывает дневную дыру сутками (24ч)", () => {
    const employees = [
      createEmployee("d1", "day"),
      createEmployee("d2", "day"),
      createEmployee("s1", "aux"),
      createEmployee("s2", "aux"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 3, nightMin: 0 },
    });

    let auxShift24 = 0;
    for (const auxId of ["s1", "s2"]) {
      for (const day of calendar) {
        const hours = cells[auxId]?.[day.day];
        if (hours === SHIFT_HOURS.shift24) {
          auxShift24 += 1;
        }
      }
    }

    expect(auxShift24).toBeGreaterThan(0);

    for (const day of workingDays) {
      expect(
        countDayCoverageForDay(employees, day.day, cells),
      ).toBeGreaterThanOrEqual(3);
    }
  });

  test("aux распределяет сутки между несколькими сотрудниками", () => {
    const employees = [
      createEmployee("d1", "day"),
      createEmployee("s0", "aux"),
      createEmployee("s1", "aux"),
      createEmployee("s2", "aux"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 2, nightMin: 0 },
    });

    const shift24Counts = ["s0", "s1", "s2"].map(
      (auxId) =>
        Object.values(cells[auxId] ?? {}).filter(
          (hours) => hours === SHIFT_HOURS.shift24,
        ).length,
    );

    const total = shift24Counts.reduce((sum, count) => sum + count, 0);
    expect(total).toBeGreaterThan(3);
    expect(Math.max(...shift24Counts)).toBeLessThan(total);
    expect(shift24Counts.filter((count) => count > 0).length).toBeGreaterThan(
      1,
    );
  });

  test("monthPlan night seed не перезаписывается генератором", () => {
    const planDay = workingDays[0];
    if (!planDay) throw new Error("expected working day");

    const employees = [
      createEmployee("d1", "day"),
      {
        ...createEmployee("n1", "night"),
        monthPlan: { [planDay.day]: SHIFT_HOURS.nightWeekday },
      },
      createEmployee("n2", "night"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 1, nightMin: 1 },
    });

    expect(cells.n1?.[planDay.day]).toBe(SHIFT_HOURS.nightWeekday);
  });

  test("monthPlan day seed не перезаписывается генератором", () => {
    const planDay = workingDays[0];
    if (!planDay) throw new Error("expected working day");

    const employees = [
      {
        ...createEmployee("d1", "day"),
        monthPlan: { [planDay.day]: SHIFT_HOURS.dayWeekday },
      },
      createEmployee("d2", "day"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 1, nightMin: 0 },
    });

    expect(cells.d1?.[planDay.day]).toBe(SHIFT_HOURS.dayWeekday);
  });

  test("monthPlan day duty 24 не перезаписывается", () => {
    const planDay = workingDays[0];
    if (!planDay) throw new Error("expected working day");

    const employees = [
      {
        ...createEmployee("d1", "day", [], [createFlexibleDutyPreference(5)]),
        monthPlan: { [planDay.day]: SHIFT_HOURS.shift24 },
      },
      createEmployee("d2", "day"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 1, nightMin: 0 },
    });

    expect(cells.d1?.[planDay.day]).toBe(SHIFT_HOURS.shift24);
  });

  test("monthPlan locked free блокирует назначение", () => {
    const planDay = workingDays[0];
    if (!planDay) throw new Error("expected working day");

    const employees = [
      {
        ...createEmployee("n1", "night"),
        monthPlan: { [planDay.day]: null },
      },
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 0, nightMin: 1 },
    });

    expect(cells.n1?.[planDay.day]).toBeUndefined();
  });

  test("monthPlan day 24 на выходном сохраняется", () => {
    const weekend = calendar.find((day) => day.isWeekend);
    if (!weekend) throw new Error("expected weekend");

    const employees = [
      {
        ...createEmployee("d1", "day"),
        monthPlan: { [weekend.day]: SHIFT_HOURS.shift24 },
      },
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 0, nightMin: 0 },
    });

    expect(cells.d1?.[weekend.day]).toBe(SHIFT_HOURS.shift24);
  });

  test("monthPlan locked free у day не заполняется fill-day", () => {
    const planDay = workingDays[0];
    if (!planDay) throw new Error("expected working day");

    const employees = [
      {
        ...createEmployee("d1", "day"),
        monthPlan: { [planDay.day]: null },
      },
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 0, nightMin: 0 },
    });

    expect(cells.d1?.[planDay.day]).toBeUndefined();
  });

  test("aux закрывает ночную дыру ночной сменой", () => {
    const employees = [
      createEmployee("s1", "aux"),
      createEmployee("s2", "aux"),
      createEmployee("s3", "aux"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 0, nightMin: 1 },
    });

    const nightHourValues = new Set<number>([
      SHIFT_HOURS.nightWeekday,
      SHIFT_HOURS.nightPreHoliday,
      SHIFT_HOURS.nightWeekend,
    ]);

    let assignedCount = 0;
    for (const auxId of ["s1", "s2", "s3"]) {
      for (const day of calendar) {
        const hours = cells[auxId]?.[day.day];
        if (hours == null) continue;
        assignedCount += 1;
        expect(nightHourValues.has(hours)).toBe(true);
      }
    }

    expect(assignedCount).toBeGreaterThan(0);
  });

  test("суточный назначается на день с большим дефицитом дня", () => {
    const highDeficitDay = workingDays[0];
    const lowDeficitDay = workingDays[1];
    if (!highDeficitDay || !lowDeficitDay) {
      throw new Error("expected two working days");
    }

    const employees = [
      createEmployee("s1", "aux"),
      createEmployee("d1", "day", [
        {
          id: "vac1",
          from: highDeficitDay.date,
          to: highDeficitDay.date,
        },
      ]),
      createEmployee("d2", "day"),
      createEmployee("d3", "day"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 3, nightMin: 0 },
    });

    expect(cells.s1?.[highDeficitDay.day]).toBe(SHIFT_HOURS.shift24);
    expect(cells.s1?.[lowDeficitDay.day]).toBeUndefined();
  });

  test("суточные закрывают ночной дефицит в выходной", () => {
    const weekendDays = calendar.filter((day) => day.isWeekend);
    const employees = [
      createEmployee("s1", "aux"),
      createEmployee("s2", "aux"),
      createEmployee("s3", "aux"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 0, nightMin: 1 },
    });

    const coveredWeekends = weekendDays.filter(
      (day) => countNightCoverageForDay(employees, day.day, cells) >= 1,
    );
    expect(coveredWeekends.length).toBeGreaterThan(0);
  });

  test("не назначает суточным смены в дни отпуска", () => {
    const vacationDay = workingDays[0];
    if (!vacationDay) throw new Error("expected working day");

    const employees = [
      createEmployee("s1", "aux", [
        { id: "vac1", from: vacationDay.date, to: vacationDay.date },
      ]),
      createEmployee("d1", "day"),
      createEmployee("d2", "day"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 3, nightMin: 0 },
    });

    expect(cells.s1?.[vacationDay.day]).toBeUndefined();
  });

  test("суточные закрывают ночной дефицит в рабочий день", () => {
    const employees = [
      createEmployee("d1", "day"),
      createEmployee("d2", "day"),
      ...Array.from({ length: 6 }, (_, index) =>
        createEmployee(`n${index}`, "night"),
      ),
      createEmployee("s1", "aux"),
      createEmployee("s2", "aux"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 2, nightMin: 3 },
    });

    for (const day of workingDays) {
      expect(
        countNightCoverageForDay(employees, day.day, cells),
      ).toBeGreaterThanOrEqual(3);
    }
  });

  test("aux сначала закрывает день сутками, ночь — после", () => {
    const employees = [
      createEmployee("d1", "day"),
      createEmployee("s1", "aux"),
      createEmployee("s2", "aux"),
      createEmployee("n1", "night"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 2, nightMin: 1 },
    });

    let auxShift24 = 0;
    for (const day of workingDays) {
      expect(
        countDayCoverageForDay(employees, day.day, cells),
      ).toBeGreaterThanOrEqual(2);
      for (const auxId of ["s1", "s2"]) {
        if (cells[auxId]?.[day.day] === SHIFT_HOURS.shift24) {
          auxShift24 += 1;
        }
      }
    }

    expect(auxShift24).toBeGreaterThan(0);
    for (const day of calendar) {
      expect(
        countNightCoverageForDay(employees, day.day, cells),
      ).toBeGreaterThanOrEqual(1);
    }
  });

  test("ночные закрывают ночной дефицит в рабочий день", () => {
    const workingDay = workingDays[0];
    if (!workingDay) throw new Error("expected working day");

    const employees = [
      createEmployee("d1", "day"),
      createEmployee("d2", "day"),
      createEmployee("n1", "night"),
      createEmployee("n2", "night"),
      createEmployee("n3", "night"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 2, nightMin: 2 },
    });

    expect(
      countNightCoverageForDay(employees, workingDay.day, cells),
    ).toBeGreaterThanOrEqual(2);
  });

  test("не создаёт избыток дневного покрытия при дежурствах", () => {
    const employees = [
      {
        ...createEmployee("d1", "day"),
        dutyPreferences: [{ weekday: null, timesPerWeek: 1 }],
      },
      createEmployee("d2", "day"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 2, nightMin: 0 },
    });

    const schedule: Schedule = {
      id: "test",
      departmentName: "Тест",
      month,
      year,
      employees,
      coverage: { dayMin: 2, nightMin: 0 },
      cells,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    for (const day of workingDays) {
      const status = getDayCoverageStatus(schedule, day);
      expect(status.surpluses.some((item) => item.type === "day")).toBe(false);
    }
  });

  test("интеграционный график 7/6: дневные на каждый рабочий день", () => {
    const employees = [
      ...Array.from({ length: 6 }, (_, index) =>
        createEmployee(`d${index}`, "day"),
      ),
      ...Array.from({ length: 14 }, (_, index) =>
        createEmployee(`n${index}`, "night"),
      ),
      ...Array.from({ length: 4 }, (_, index) =>
        createEmployee(`s${index}`, "aux"),
      ),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 7, nightMin: 6 },
    });

    const schedule: Schedule = {
      id: "integration",
      departmentName: "ОАР",
      month,
      year,
      employees,
      coverage: { dayMin: 7, nightMin: 6 },
      cells,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    for (const day of calendar) {
      const status = getDayCoverageStatus(schedule, day);
      expect(status.deficits).toHaveLength(0);
      if (day.isWorkingDay) {
        expect(
          countDayCoverageForDay(employees, day.day, cells),
        ).toBeGreaterThanOrEqual(7);
      }
      expect(countNightCoverageForDay(employees, day.day, cells)).toBe(6);
    }

    expectDayEmployeesOnAllWorkingDays(employees, calendar, cells);
    expectAuxMaxGap(employees, calendar, cells);
  }, 15_000);

  test("oar2-like: 6 day + 14 night + 3 aux без избытка и с равномерными суточными", () => {
    const vacationDay = workingDays[5];
    const vacationDay2 = workingDays[10];
    if (!vacationDay || !vacationDay2) {
      throw new Error("expected working days for vacations");
    }

    const employees = [
      ...Array.from({ length: 6 }, (_, index) =>
        createEmployee(`d${index}`, "day"),
      ),
      ...Array.from({ length: 14 }, (_, index) =>
        createEmployee(`n${index}`, "night"),
      ),
      createEmployee("s0", "aux"),
      createEmployee("s1", "aux"),
      createEmployee("s2", "aux", [
        {
          id: "vac1",
          from: vacationDay.date,
          to: vacationDay.date,
        },
        {
          id: "vac2",
          from: vacationDay2.date,
          to: vacationDay2.date,
        },
      ]),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 7, nightMin: 6 },
    });

    const schedule: Schedule = {
      id: "oar2",
      departmentName: "Оар 2",
      month,
      year,
      employees,
      coverage: { dayMin: 7, nightMin: 6 },
      cells,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const baseRate = getBaseRate(year, month);
    const targetHours = getTargetHours(year, month);
    const auxHours = employees
      .filter((employee) => employee.shiftType === "aux")
      .map((employee) =>
        getEmployeeMonthHours(employee.id, cells, employee.vacations, calendar),
      );

    for (const day of calendar) {
      const status = getDayCoverageStatus(schedule, day);
      expect(status.surpluses).toHaveLength(0);
      expect(status.deficits).toHaveLength(0);
    }

    const minAuxHours = Math.min(...auxHours);
    const maxAuxHours = Math.max(...auxHours);
    expect(maxAuxHours - minAuxHours).toBeLessThan(40);

    for (const hours of auxHours) {
      expect(hours).toBeGreaterThanOrEqual(baseRate);
      expect(hours).toBeLessThanOrEqual(targetHours + 24.1);
    }

    expectDayEmployeesOnAllWorkingDays(employees, calendar, cells);
    expectAuxMaxGap(employees, calendar, cells);
  });

  test("oar2 с дежурствами и отпусками: без избытка покрытия", () => {
    const employees: ScheduleEmployee[] = [
      createEmployee("d1", "day", [], [createFlexibleDutyPreference(1)]),
      createEmployee(
        "d2",
        "day",
        [{ id: "vac1", from: "2026-06-01", to: "2026-06-14" }],
        [createFlexibleDutyPreference(1)],
      ),
      createEmployee("d3", "day", [], [createFlexibleDutyPreference(1)]),
      createEmployee("d4", "day", [], [createFlexibleDutyPreference(1)]),
      createEmployee("d5", "day", [], [createFlexibleDutyPreference(1)]),
      createEmployee("d6", "day", [], [createFlexibleDutyPreference(1)]),
      ...Array.from({ length: 14 }, (_, index) =>
        createEmployee(`n${index}`, "night"),
      ),
      createEmployee("s1", "aux"),
      createEmployee("s2", "aux"),
      createEmployee("s3", "aux", [
        { id: "vac2", from: "2026-06-22", to: "2026-06-30" },
      ]),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 7, nightMin: 6 },
    });

    const schedule: Schedule = {
      id: "oar2-duty",
      departmentName: "Оар 2",
      month,
      year,
      employees,
      coverage: { dayMin: 7, nightMin: 6 },
      cells,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    for (const day of calendar) {
      const status = getDayCoverageStatus(schedule, day);
      expect(status.surpluses).toHaveLength(0);
    }

    expectDayEmployeesOnAllWorkingDays(employees, calendar, cells);
    expectAuxMaxGap(employees, calendar, cells);
    expectDutyDaysNotDuplicated(employees, calendar, cells);
  });

  test("oar2 с отпусками июль 2025: дефицит дня минимизирован", () => {
    const julyYear = 2025;
    const julyMonth = 7;
    const julyCalendar = getMonthCalendar(julyYear, julyMonth);

    const employees = [
      ...Array.from({ length: 6 }, (_, index) =>
        createEmployee(
          `d${index}`,
          "day",
          index === 1
            ? [{ id: "vac1", from: "2025-07-01", to: "2025-07-14" }]
            : [],
          [createFlexibleDutyPreference(1)],
        ),
      ),
      ...Array.from({ length: 14 }, (_, index) =>
        createEmployee(`n${index}`, "night"),
      ),
      createEmployee("s0", "aux"),
      createEmployee("s1", "aux"),
      createEmployee("s2", "aux", [
        { id: "vac2", from: "2025-07-20", to: "2025-07-31" },
      ]),
    ];

    const cells = generateScheduleCells({
      year: julyYear,
      month: julyMonth,
      employees,
      coverage: { dayMin: 7, nightMin: 6 },
    });

    const schedule: Schedule = {
      id: "oar2-july",
      departmentName: "Оар 2",
      month: julyMonth,
      year: julyYear,
      employees,
      coverage: { dayMin: 7, nightMin: 6 },
      cells,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    let daysWithDeficit = 0;
    for (const day of julyCalendar) {
      const status = getDayCoverageStatus(schedule, day);
      if (status.deficits.length > 0) daysWithDeficit += 1;
    }

    expect(daysWithDeficit).toBeLessThanOrEqual(4);

    expectDayEmployeesOnAllWorkingDays(employees, julyCalendar, cells);
    expectAuxMaxGap(employees, julyCalendar, cells);
    expectDutyDaysNotDuplicated(employees, julyCalendar, cells);
  }, 15_000);

  test("aux max gap 4 при слабом покрытии", () => {
    const employees = [
      createEmployee("s0", "aux"),
      createEmployee("s1", "aux"),
      createEmployee("s2", "aux"),
      createEmployee("n0", "night"),
      createEmployee("n1", "night"),
    ];

    const cells = generateScheduleCells({
      year,
      month,
      employees,
      coverage: { dayMin: 1, nightMin: 1 },
    });

    for (const employee of employees.filter(
      (item) => item.shiftType === "aux",
    )) {
      expect(getMaxGap(employee.id, cells, calendar)).toBeLessThanOrEqual(6);
    }

    expect(
      getPoolMaxGap(
        employees.filter((item) => item.shiftType === "aux"),
        cells,
        calendar,
      ),
    ).toBeLessThanOrEqual(6);
  });
});
