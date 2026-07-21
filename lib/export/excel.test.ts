import { beforeEach, describe, expect, test } from "bun:test";
import { exportScheduleToExcel } from "@/lib/export/excel";
import type { Schedule } from "@/lib/types";

const schedule: Schedule = {
  id: "s1",
  departmentName: "ОАР-2",
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
  cells: { e1: { 1: 7.8 } },
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("exportScheduleToExcel", () => {
  beforeEach(() => {
    URL.revokeObjectURL = () => {};
    URL.createObjectURL = () => "blob:test";
  });

  test("создаёт файл Excel без ошибок", async () => {
    let clicked = false;
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = ((tag: string) => {
      const element = originalCreateElement(tag);
      if (tag === "a") {
        element.click = () => {
          clicked = true;
        };
      }
      return element;
    }) as typeof document.createElement;

    try {
      await exportScheduleToExcel(schedule);
      expect(clicked).toBe(true);
    } finally {
      document.createElement = originalCreateElement;
    }
  });
});
