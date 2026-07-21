import { afterAll, describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useScheduleEmployeesEditor } from "@/lib/hooks/use-schedule-employees-editor";
import type { Schedule } from "@/lib/types";
import { TestProviders } from "@/test/render";

const syncEmployeesToList = mock(() => ({
  ok: true as const,
  updated: 1,
  added: 0,
}));

mock.module("@/lib/sync-employee-list", () => ({
  syncEmployeesToList,
}));

const schedule: Schedule = {
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
  sourceListId: "list-1",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("useScheduleEmployeesEditor", () => {
  test("handleSyncToList вызывает syncEmployeesToList", () => {
    const onChange = mock(() => {});
    const { result } = renderHook(
      () => useScheduleEmployeesEditor({ schedule, onChange }),
      { wrapper: TestProviders },
    );

    act(() => {
      result.current.handleSyncToList();
    });

    expect(syncEmployeesToList).toHaveBeenCalledWith(
      "list-1",
      schedule.employees,
    );
  });
});

afterAll(() => {
  mock.restore();
});
