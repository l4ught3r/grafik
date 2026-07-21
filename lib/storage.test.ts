import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { DEMO_SCHEDULE_ID } from "@/lib/seed/demo-schedule";
import { DEFAULT_EMPLOYEE_LIST_ID } from "@/lib/seed/default-employee-list";
import { NURSES_EMPLOYEE_LIST_ID } from "@/lib/seed/nurses-employee-list";
import {
  deleteEmployeeList,
  deleteSchedule,
  EMPLOYEE_LISTS_STORAGE_KEY,
  ensureDefaultEmployeeLists,
  ensureDefaultSchedules,
  getEmployeeList,
  getEmployeeLists,
  getSchedule,
  getSchedules,
  SCHEDULES_STORAGE_KEY,
  saveEmployeeList,
  saveSchedule,
  writeSchedules,
} from "@/lib/storage";
import type { EmployeeList, Schedule } from "@/lib/types";

const SCHEDULES_KEY = SCHEDULES_STORAGE_KEY;
const EMPLOYEE_LISTS_KEY = EMPLOYEE_LISTS_STORAGE_KEY;

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: "schedule-1",
    departmentName: "ОАР-2",
    month: 4,
    year: 2025,
    employees: [],
    coverage: { dayMin: 1, nightMin: 0 },
    cells: {},
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("saveSchedule и getSchedule round-trip", () => {
    const schedule = makeSchedule();
    saveSchedule(schedule);
    expect(getSchedule("schedule-1")).toEqual({
      ...schedule,
      updatedAt: expect.any(String),
    });
  });

  test("saveSchedule с existing не читает localStorage повторно", () => {
    const first = makeSchedule({ id: "a" });
    const second = makeSchedule({ id: "b", departmentName: "ОАР-1" });
    saveSchedule(first);
    const existing = getSchedules();
    saveSchedule(second, existing);
    expect(getSchedules().map((s) => s.id).sort()).toEqual(["a", "b"]);
  });

  test("writeSchedules пишет массив как есть", () => {
    const schedule = makeSchedule();
    const result = writeSchedules([schedule]);
    expect(result.ok).toBe(true);
    expect(getSchedules()).toEqual([schedule]);
  });

  test("мигрирует legacy schedule без signatures в результате", () => {
    const legacy = {
      ...makeSchedule(),
      signatures: { head: "Подпись" },
    };
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify([legacy]));

    const schedules = getSchedules();
    expect(schedules).toHaveLength(1);
    expect(schedules[0]).not.toHaveProperty("signatures");
    expect(schedules[0]?.departmentName).toBe("ОАР-2");
  });

  test("мигрирует legacy employee list с employeeNames", () => {
    localStorage.setItem(
      EMPLOYEE_LISTS_KEY,
      JSON.stringify([
        {
          id: "legacy-list",
          name: "Старый список",
          employeeNames: ["Иванов И.И."],
        },
      ]),
    );

    const lists = getEmployeeLists();
    expect(lists).toHaveLength(1);
    expect(lists[0]?.members).toHaveLength(1);
    expect(lists[0]?.members[0]?.name).toBe("Иванов И.И.");
    expect(lists[0]?.members[0]?.shiftType).toBe("day");
  });

  test("мигрирует legacy shiftType shift24 в aux у сотрудников графика", () => {
    const legacy = {
      ...makeSchedule(),
      employees: [
        {
          id: "s1",
          name: "Суточный",
          shiftType: "shift24",
          vacations: [],
        },
      ],
    };
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify([legacy]));

    const schedules = getSchedules();
    expect(schedules).toHaveLength(1);
    expect(schedules[0]?.employees[0]?.shiftType).toBe("aux");
  });

  test("мигрирует legacy shiftType shift24 в aux у участников списка", () => {
    localStorage.setItem(
      EMPLOYEE_LISTS_KEY,
      JSON.stringify([
        {
          id: "legacy-aux",
          name: "Список с суточными",
          members: [
            {
              id: "m1",
              name: "Суточный",
              shiftType: "shift24",
              dutyPreferences: [],
            },
          ],
        },
      ]),
    );

    const lists = getEmployeeLists();
    expect(lists).toHaveLength(1);
    expect(lists[0]?.members[0]?.shiftType).toBe("aux");
  });

  test("invalid JSON возвращает пустой массив", () => {
    localStorage.setItem(SCHEDULES_KEY, "{not-json");
    expect(getSchedules()).toEqual([]);
  });

  test("ensureDefaultEmployeeLists создаёт встроенные списки", () => {
    ensureDefaultEmployeeLists();
    const oar2 = getEmployeeList(DEFAULT_EMPLOYEE_LIST_ID);
    const nurses = getEmployeeList(NURSES_EMPLOYEE_LIST_ID);
    expect(oar2?.members.length).toBeGreaterThan(0);
    expect(nurses?.name).toBe("Ср. мед персонал");
    expect(nurses?.members).toHaveLength(55);
  });

  test("ensureDefaultSchedules создаёт демо-график если его нет", () => {
    expect(getSchedule(DEMO_SCHEDULE_ID)).toBeUndefined();

    ensureDefaultSchedules();

    const demo = getSchedule(DEMO_SCHEDULE_ID);
    expect(demo?.departmentName).toBe("Младшие");
    expect(demo?.month).toBe(7);
    expect(demo?.year).toBe(2026);
    expect(demo?.employees.length).toBeGreaterThan(0);
  });

  test("ensureDefaultSchedules не перезаписывает существующий демо-график", () => {
    ensureDefaultSchedules();
    const existing = getSchedule(DEMO_SCHEDULE_ID);
    expect(existing).toBeDefined();

    saveSchedule({
      ...existing!,
      departmentName: "Изменённое имя",
    });

    ensureDefaultSchedules();

    expect(getSchedule(DEMO_SCHEDULE_ID)?.departmentName).toBe(
      "Изменённое имя",
    );
  });

  test("deleteSchedule и deleteEmployeeList удаляют записи", () => {
    saveSchedule(makeSchedule());
    const list: EmployeeList = {
      id: "list-1",
      name: "Тест",
      members: [],
    };
    saveEmployeeList(list);

    deleteSchedule("schedule-1");
    deleteEmployeeList("list-1");

    expect(getSchedules()).toEqual([]);
    expect(getEmployeeLists()).toEqual([]);
  });
});
