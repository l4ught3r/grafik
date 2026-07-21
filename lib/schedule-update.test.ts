import { describe, expect, test } from "bun:test";
import { getMonthCalendar } from "@/lib/calendar";
import {
  addScheduleEmployee,
  applyEmployeeChange,
  applySchedulePeriodChange,
  clearAllEmployeeCells,
  clearEmployeeVacationDays,
  regenerateSchedule,
  removeScheduleEmployee,
} from "@/lib/schedule-update";
import type { Schedule, ScheduleEmployee } from "@/lib/types";

const year = 2026;
const month = 6;
const calendar = getMonthCalendar(year, month);

function createEmployee(
  id: string,
  shiftType: ScheduleEmployee["shiftType"] = "day",
  vacations: ScheduleEmployee["vacations"] = [],
): ScheduleEmployee {
  return {
    id,
    name: `Сотрудник ${id}`,
    shiftType,
    vacations,
    dutyPreferences: [],
  };
}

function createSchedule(
  employees: ScheduleEmployee[],
  cells: Schedule["cells"] = {},
): Schedule {
  return {
    id: "sched-1",
    departmentName: "Тест",
    month,
    year,
    employees,
    coverage: { dayMin: 1, nightMin: 0 },
    cells,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("clearEmployeeVacationDays", () => {
  test("очищает ячейки в дни отпуска", () => {
    const vacationDay = calendar.find((d) => d.isWorkingDay);
    if (!vacationDay) throw new Error("expected working day");

    const cells = { emp1: { [vacationDay.day]: 7.8, 5: 7.8 } };
    const vacations = [
      { id: "v1", from: vacationDay.date, to: vacationDay.date },
    ];

    const next = clearEmployeeVacationDays(cells, "emp1", calendar, vacations);

    expect(next.emp1?.[vacationDay.day]).toBeUndefined();
    expect(next.emp1?.[5]).toBe(7.8);
  });
});

describe("clearAllEmployeeCells", () => {
  test("удаляет все ячейки сотрудника", () => {
    const cells = { emp1: { 1: 7.8, 2: 7.8 }, emp2: { 3: 9.1 } };
    const next = clearAllEmployeeCells(cells, "emp1");

    expect(next.emp1).toBeUndefined();
    expect(next.emp2?.[3]).toBe(9.1);
  });
});

describe("applyEmployeeChange", () => {
  test("очищает ячейки при смене типа смены", () => {
    const employee = createEmployee("emp1", "day");
    const schedule = createSchedule([employee], { emp1: { 1: 7.8, 2: 7.8 } });

    const next = applyEmployeeChange(schedule, 0, {
      ...employee,
      shiftType: "night",
    });

    expect(next.employees[0]?.shiftType).toBe("night");
    expect(next.cells.emp1).toBeUndefined();
    expect(schedule.cells.emp1?.[1]).toBe(7.8);
  });

  test("очищает ячейки в дни отпуска при изменении отпусков", () => {
    const vacationDay = calendar.find((d) => d.isWorkingDay);
    if (!vacationDay) throw new Error("expected working day");

    const employee = createEmployee("emp1", "day");
    const schedule = createSchedule([employee], {
      emp1: { [vacationDay.day]: 7.8 },
    });

    const next = applyEmployeeChange(schedule, 0, {
      ...employee,
      vacations: [{ id: "v1", from: vacationDay.date, to: vacationDay.date }],
    });

    expect(next.cells.emp1?.[vacationDay.day]).toBeUndefined();
  });

  test("не меняет ячейки при изменении только имени", () => {
    const employee = createEmployee("emp1", "day");
    const schedule = createSchedule([employee], { emp1: { 1: 7.8 } });

    const next = applyEmployeeChange(schedule, 0, {
      ...employee,
      name: "Новое имя",
    });

    expect(next.employees[0]?.name).toBe("Новое имя");
    expect(next.cells.emp1?.[1]).toBe(7.8);
  });
});

describe("removeScheduleEmployee", () => {
  test("удаляет сотрудника и его ячейки", () => {
    const schedule = createSchedule(
      [createEmployee("emp1"), createEmployee("emp2")],
      { emp1: { 1: 7.8 }, emp2: { 2: 7.8 } },
    );

    const next = removeScheduleEmployee(schedule, 0);

    expect(next.employees).toHaveLength(1);
    expect(next.employees[0]?.id).toBe("emp2");
    expect(next.cells.emp1).toBeUndefined();
    expect(next.cells.emp2?.[2]).toBe(7.8);
  });
});

describe("addScheduleEmployee", () => {
  test("добавляет сотрудника с пустыми ячейками", () => {
    const schedule = createSchedule([createEmployee("emp1")]);
    const newEmployee = createEmployee("emp2");

    const next = addScheduleEmployee(schedule, newEmployee);

    expect(next.employees).toHaveLength(2);
    expect(next.cells.emp2).toEqual({});
  });
});

describe("regenerateSchedule", () => {
  test("сохраняет id и обновляет cells", () => {
    const employees = [
      createEmployee("d1", "day"),
      createEmployee("d2", "day"),
      createEmployee("d3", "day"),
    ];
    const schedule = createSchedule(employees, { d1: { 1: 99 } });

    const next = regenerateSchedule(schedule);

    expect(next.id).toBe(schedule.id);
    expect(next.departmentName).toBe(schedule.departmentName);
    expect(next.cells).not.toEqual(schedule.cells);
    expect(next.updatedAt).not.toBe(schedule.updatedAt);
    expect(Object.keys(next.cells).length).toBeGreaterThan(0);
  });

  test("не мутирует исходный schedule", () => {
    const schedule = createSchedule(
      [createEmployee("d1"), createEmployee("d2"), createEmployee("d3")],
      { d1: { 1: 99 } },
    );
    const originalCells = schedule.cells;

    regenerateSchedule(schedule);

    expect(schedule.cells).toBe(originalCells);
    expect(schedule.cells.d1?.[1]).toBe(99);
  });
});

describe("applySchedulePeriodChange", () => {
  test("обрезает ячейки вне нового месяца", () => {
    const schedule = createSchedule([createEmployee("e1")], {
      e1: { 28: 7.8, 29: 7.8, 30: 7.8, 31: 7.8 },
    });

    const next = applySchedulePeriodChange(schedule, 2, 2026, {
      regenerate: false,
    });

    expect(next.month).toBe(2);
    expect(next.cells.e1?.[31]).toBeUndefined();
  });
});
