import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { ToastProvider } from "@/components/providers/ToastProvider";
import type { Schedule } from "@/lib/types";

mock.module("@/lib/export/print", () => ({
  printSchedule: mock(() => {}),
}));

mock.module("@/lib/export/pdf", () => ({
  exportScheduleToPdf: mock(async () => {}),
}));

mock.module("@/lib/export/excel", () => ({
  exportScheduleToExcel: mock(async () => {}),
}));

const { ScheduleToolbar } = await import(
  "@/components/schedule/ScheduleToolbar"
);

const schedule: Schedule = {
  id: "s1",
  departmentName: "ОАР-2",
  month: 4,
  year: 2025,
  employees: [],
  coverage: { dayMin: 0, nightMin: 0 },
  cells: {},
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const defaultProps = {
  schedule,
  onOpenEmployees: () => {},
  onRegenerate: () => {},
  onDelete: () => {},
};

function renderToolbar(props: ComponentProps<typeof ScheduleToolbar>) {
  return render(
    <ToastProvider>
      <ScheduleToolbar {...props} />
    </ToastProvider>,
  );
}

describe("ScheduleToolbar", () => {
  afterEach(() => {
    cleanup();
  });

  test("экспорт: печать через dropdown", () => {
    renderToolbar(defaultProps);
    fireEvent.click(screen.getByRole("button", { name: "Экспорт" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Печать" }));
    expect(screen.getByText("Открыто окно печати")).toBeInTheDocument();
  });

  test("нет кнопки б/л", () => {
    renderToolbar(defaultProps);
    expect(
      screen.queryByRole("button", { name: "б/л" }),
    ).not.toBeInTheDocument();
  });
});

afterAll(() => {
  mock.restore();
});
