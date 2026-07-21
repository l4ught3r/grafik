import { describe, expect, test } from "bun:test";
import { EMPLOYEE_LISTS_STORAGE_KEY } from "@/lib/storage";
import { syncEmployeesToList } from "@/lib/sync-employee-list";
import type { EmployeeList, ScheduleEmployee } from "@/lib/types";

describe("syncEmployeesToList", () => {
  test("обновляет совпадающих сотрудников по id", () => {
    const list: EmployeeList = {
      id: "list-1",
      name: "Тест",
      members: [
        {
          id: "e1",
          name: "Старое имя",
          shiftType: "day",
          dutyPreferences: [],
        },
      ],
    };

    localStorage.setItem(EMPLOYEE_LISTS_STORAGE_KEY, JSON.stringify([list]));

    const employees: ScheduleEmployee[] = [
      {
        id: "e1",
        name: "Новое имя",
        shiftType: "night",
        vacations: [],
        dutyPreferences: [],
      },
    ];

    const result = syncEmployeesToList("list-1", employees);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.updated).toBe(1);
      expect(result.added).toBe(0);
    }

    const stored = JSON.parse(
      localStorage.getItem(EMPLOYEE_LISTS_STORAGE_KEY) ?? "[]",
    ) as EmployeeList[];
    expect(stored[0]?.members[0]?.name).toBe("Новое имя");
    expect(stored[0]?.members[0]?.shiftType).toBe("night");

    localStorage.removeItem(EMPLOYEE_LISTS_STORAGE_KEY);
  });

  test("добавляет новых сотрудников графика в список", () => {
    const list: EmployeeList = {
      id: "list-1",
      name: "Тест",
      members: [
        {
          id: "e1",
          name: "Иванов",
          shiftType: "day",
          dutyPreferences: [],
        },
      ],
    };

    localStorage.setItem(EMPLOYEE_LISTS_STORAGE_KEY, JSON.stringify([list]));

    const employees: ScheduleEmployee[] = [
      {
        id: "e1",
        name: "Иванов",
        shiftType: "day",
        vacations: [],
      },
      {
        id: "e2",
        name: "Петров",
        shiftType: "night",
        vacations: [],
      },
    ];

    const result = syncEmployeesToList("list-1", employees);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.updated).toBe(1);
      expect(result.added).toBe(1);
    }

    const stored = JSON.parse(
      localStorage.getItem(EMPLOYEE_LISTS_STORAGE_KEY) ?? "[]",
    ) as EmployeeList[];
    expect(stored[0]?.members).toHaveLength(2);
    expect(stored[0]?.members.some((member) => member.id === "e2")).toBe(true);

    localStorage.removeItem(EMPLOYEE_LISTS_STORAGE_KEY);
  });

  test("не добавляет сотрудника с пустым именем", () => {
    const list: EmployeeList = {
      id: "list-1",
      name: "Тест",
      members: [],
    };

    localStorage.setItem(EMPLOYEE_LISTS_STORAGE_KEY, JSON.stringify([list]));

    const result = syncEmployeesToList("list-1", [
      {
        id: "e1",
        name: "   ",
        shiftType: "day",
        vacations: [],
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.updated).toBe(0);
      expect(result.added).toBe(0);
    }

    localStorage.removeItem(EMPLOYEE_LISTS_STORAGE_KEY);
  });

  test("возвращает нули при полном несовпадении без новых имён", () => {
    const list: EmployeeList = {
      id: "list-1",
      name: "Тест",
      members: [
        {
          id: "e1",
          name: "Иванов",
          shiftType: "day",
          dutyPreferences: [],
        },
      ],
    };

    localStorage.setItem(EMPLOYEE_LISTS_STORAGE_KEY, JSON.stringify([list]));

    const result = syncEmployeesToList("list-1", [
      {
        id: "e2",
        name: "",
        shiftType: "day",
        vacations: [],
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.updated).toBe(0);
      expect(result.added).toBe(0);
    }

    localStorage.removeItem(EMPLOYEE_LISTS_STORAGE_KEY);
  });
});
