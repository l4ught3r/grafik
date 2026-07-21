import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ScheduleStatusBar } from "@/components/schedule/ScheduleStatusBar";
import type { Schedule } from "@/lib/types";

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
  coverage: { dayMin: 2, nightMin: 0 },
  cells: {},
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("ScheduleStatusBar", () => {
  afterEach(() => {
    cleanup();
  });

  test("показывает замечания при дефиците", () => {
    render(<ScheduleStatusBar schedule={schedule} />);
    expect(screen.getByText(/замечан/i)).toBeInTheDocument();
  });

  test("раскрывает детали по клику", () => {
    render(<ScheduleStatusBar schedule={schedule} />);
    fireEvent.click(
      screen.getByRole("button", { name: /замечаний по графику/i }),
    );
    expect(screen.getByText(/Дней с дефицитом покрытия/i)).toBeInTheDocument();
  });
});
