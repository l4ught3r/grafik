import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { ScheduleMetadataPanel } from "@/components/schedule/ScheduleMetadataPanel";
import type { Schedule } from "@/lib/types";

const schedule: Schedule = {
  id: "s1",
  departmentName: "ОАР-2",
  month: 4,
  year: 2025,
  employees: [],
  coverage: { dayMin: 1, nightMin: 0 },
  cells: {},
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("ScheduleMetadataPanel", () => {
  test("рендерит поля настроек", () => {
    render(
      <ScheduleMetadataPanel schedule={schedule} open onChange={() => {}} />,
    );
    expect(screen.getByLabelText("Отделение")).toHaveValue("ОАР-2");
    expect(screen.getByText("Настройки графика")).toBeInTheDocument();
  });
});
