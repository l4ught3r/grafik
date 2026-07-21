import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useSchedules } from "@/lib/hooks/use-schedules";
import type { Schedule } from "@/lib/types";
import { TestProviders } from "@/test/render";

const schedule: Schedule = {
  id: "hook-schedule-1",
  departmentName: "Test",
  month: 1,
  year: 2025,
  employees: [],
  coverage: { dayMin: 0, nightMin: 0 },
  cells: {},
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("useSchedules", () => {
  test("загружает графики из localStorage", async () => {
    const { result } = renderHook(() => useSchedules(), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });

    expect(result.current.schedules).toEqual([]);
  });

  test("save добавляет график", async () => {
    const { result } = renderHook(() => useSchedules(), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });

    act(() => {
      const saveResult = result.current.save(schedule);
      expect(saveResult.ok).toBe(true);
    });

    await waitFor(() => {
      expect(
        result.current.schedules.some((item) => item.id === schedule.id),
      ).toBe(true);
    });
  });
});
