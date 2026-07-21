import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { ScheduleEditorHeader } from "@/components/schedule/ScheduleEditorHeader";
import type { Schedule } from "@/lib/types";

const schedule: Schedule = {
  id: "s1",
  departmentName: "ОАР-2",
  month: 4,
  year: 2025,
  employees: [],
  coverage: { dayMin: 1, nightMin: 2 },
  cells: {},
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("ScheduleEditorHeader", () => {
  test("рендерит название, месяц и ставку", () => {
    render(<ScheduleEditorHeader schedule={schedule} onChange={() => {}} />);
    expect(
      screen.getByRole("button", { name: schedule.departmentName }),
    ).toBeInTheDocument();
    expect(screen.getByText("Апрель 2025")).toBeInTheDocument();
    expect(screen.getByText(/Ставка:/)).toBeInTheDocument();
  });
});
