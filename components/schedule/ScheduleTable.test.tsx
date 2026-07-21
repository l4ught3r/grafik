import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ScheduleTable } from "@/components/schedule/ScheduleTable";
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
  cells: { e1: { 5: 7.8, 10: null } },
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("ScheduleTable", () => {
  afterEach(() => {
    cleanup();
  });

  test("рендерит таблицу с отделением и сотрудником", () => {
    render(
      <ScheduleTable
        schedule={schedule}
        lastChanged={null}
        onCellChange={() => {}}
        onSickToggle={() => {}}
        onCellMove={() => {}}
      />,
    );

    expect(screen.getByText("Иванов")).toBeInTheDocument();
    expect(document.querySelector('td[data-day="5"] button')).toHaveTextContent(
      "7,8",
    );
  });

  test("строка покрытия в tfoot с объединённой подписью", () => {
    render(
      <ScheduleTable
        schedule={schedule}
        lastChanged={null}
        onCellChange={() => {}}
        onSickToggle={() => {}}
        onCellMove={() => {}}
      />,
    );

    const footer = document.querySelector("tfoot.schedule-coverage-footer");
    expect(footer).not.toBeNull();
    expect(screen.getByText("Покрытие")).toBeInTheDocument();
    expect(screen.queryByText("—")).toBeNull();

    const labelCell = footer?.querySelector(".schedule-coverage-footer-label");
    expect(labelCell?.getAttribute("colspan")).toBe("2");
  });

  test("показывает подпись отпуска поверх сегмента", () => {
    const scheduleWithVacation: Schedule = {
      ...schedule,
      employees: [
        {
          id: "e1",
          name: "Иванов",
          shiftType: "day",
          vacations: [{ id: "v1", from: "2025-04-10", to: "2025-04-12" }],
        },
      ],
    };

    render(
      <ScheduleTable
        schedule={scheduleWithVacation}
        lastChanged={null}
        onCellChange={() => {}}
        onSickToggle={() => {}}
        onCellMove={() => {}}
      />,
    );

    expect(screen.getByText("Отпуск с 10.04 по 12.04")).toBeInTheDocument();

    const vacationCells = document.querySelectorAll('td[data-vacation="true"]');
    expect(vacationCells).toHaveLength(3);
    expect(vacationCells[0]?.querySelector("span")?.textContent).toBe(
      "Отпуск с 10.04 по 12.04",
    );
    expect(vacationCells[1]?.querySelector("span")).toBeNull();
    expect(vacationCells[2]?.querySelector("span")).toBeNull();
    expect(vacationCells[0]?.querySelector("span")?.style.left).toBe("150%");
  });

  test("тап открывает меню на заполненной ячейке", () => {
    render(
      <ScheduleTable
        schedule={schedule}
        lastChanged={null}
        onCellChange={() => {}}
        onSickToggle={() => {}}
        onCellMove={() => {}}
      />,
    );

    const sourceButton = document.querySelector(
      'td[data-day="5"] button',
    ) as HTMLButtonElement | null;
    if (!sourceButton) throw new Error("expected source cell button");

    fireEvent.click(sourceButton);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });
});
