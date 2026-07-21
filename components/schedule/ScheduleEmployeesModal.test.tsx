import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { ToastProvider } from "@/components/providers/ToastProvider";
import type { Schedule } from "@/lib/types";

const syncEmployeesToList = mock(() => ({
  ok: true as const,
  updated: 0,
  added: 0,
}));

mock.module("@/lib/hooks/use-employee-lists", () => ({
  useEmployeeLists: () => ({
    lists: [{ id: "list-1", name: "Список 1", members: [] }],
    ready: true,
  }),
}));

mock.module("@/lib/sync-employee-list", () => ({
  syncEmployeesToList,
}));

const { ScheduleEmployeesModal } = await import(
  "@/components/schedule/ScheduleEmployeesModal"
);

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
  cells: {},
  sourceListId: "list-1",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

function renderModal(props: ComponentProps<typeof ScheduleEmployeesModal>) {
  return render(
    <ToastProvider>
      <ScheduleEmployeesModal {...props} />
    </ToastProvider>,
  );
}

describe("ScheduleEmployeesModal", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    syncEmployeesToList.mockClear();
  });

  test("sync при 0 совпадений показывает ошибку", () => {
    syncEmployeesToList.mockReturnValue({
      ok: true,
      updated: 0,
      added: 0,
    });

    renderModal({
      schedule,
      open: true,
      onClose: () => {},
      onChange: () => {},
    });

    fireEvent.click(screen.getByRole("button", { name: "Сохранить в список" }));

    expect(
      screen.getByText(
        "В выбранном списке нет совпадений по id, новых сотрудников для добавления нет",
      ),
    ).toBeInTheDocument();
  });

  test("рендерит поля покрытия смен", () => {
    renderModal({
      schedule,
      open: true,
      onClose: () => {},
      onChange: () => {},
    });

    expect(screen.getByLabelText("Дневные смены")).toHaveValue(1);
    expect(screen.getByLabelText("Ночные смены")).toHaveValue(0);
    expect(screen.getByText("Минимальное покрытие смен")).toBeInTheDocument();
  });

  test("модалка не скроллится сама при фокусе на тип смены", () => {
    const manyEmployees = Array.from({ length: 12 }, (_, index) => ({
      id: `e${index}`,
      name: `Сотрудник ${index + 1}`,
      shiftType: index % 2 === 0 ? ("day" as const) : ("night" as const),
      vacations: [],
    }));

    renderModal({
      schedule: { ...schedule, employees: manyEmployees },
      open: true,
      onClose: () => {},
      onChange: () => {},
    });

    const dialog = screen.getByRole("dialog", { name: "Сотрудники и покрытие" });
    expect(dialog.className).toContain("overflow-clip");

    const scrollRegion = dialog.querySelector(".min-h-0.overflow-y-auto");
    expect(scrollRegion).not.toBeNull();

    const nightRadios = screen.getAllByRole("radio", { name: "Ночь" });
    const lastNight = nightRadios.at(-1);
    expect(lastNight).toBeTruthy();

    dialog.scrollTop = 0;
    fireEvent.click(lastNight!);

    expect(dialog.scrollTop).toBe(0);
    expect(screen.getByText("Сотрудники и покрытие")).toBeVisible();
  });

  test("sync с добавлением показывает счётчики", () => {
    syncEmployeesToList.mockReturnValue({
      ok: true,
      updated: 1,
      added: 2,
    });

    renderModal({
      schedule,
      open: true,
      onClose: () => {},
      onChange: () => {},
    });

    fireEvent.click(screen.getByRole("button", { name: "Сохранить в список" }));

    expect(screen.getByText("Обновлено: 1, добавлено: 2")).toBeInTheDocument();
  });
});

afterAll(() => {
  mock.restore();
});
