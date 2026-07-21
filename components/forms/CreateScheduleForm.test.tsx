import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { getSchedules } from "@/lib/storage";
import { TestProviders } from "@/test/render";

const push = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const { CreateScheduleForm } = await import(
  "@/components/forms/CreateScheduleForm"
);

function renderForm() {
  return render(
    <TestProviders>
      <CreateScheduleForm />
    </TestProviders>,
  );
}

describe("CreateScheduleForm", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    push.mockClear();
  });

  test("рендерит поля формы", () => {
    renderForm();
    expect(
      screen.getByRole("heading", { name: "Новый график" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Отделение")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Сгенерировать график" }),
    ).toBeInTheDocument();
  });

  test("submit без отделения показывает ошибку", () => {
    renderForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Сгенерировать график" }),
    );
    expect(screen.getByText("Укажите название отделения")).toBeInTheDocument();
    expect(getSchedules()).toHaveLength(0);
  });

  test("submit с валидными данными сохраняет график", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Отделение"), {
      target: { value: "ОАР-2" },
    });
    fireEvent.change(screen.getByLabelText("Дневные смены"), {
      target: { value: "1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "+ Добавить сотрудника" }),
    );
    fireEvent.change(screen.getByLabelText("ФИО сотрудника"), {
      target: { value: "Иванов" },
    });
    fireEvent.click(screen.getByLabelText("День"));
    fireEvent.click(
      screen.getByRole("button", { name: "Сгенерировать график" }),
    );

    expect(getSchedules()).toHaveLength(1);
    expect(getSchedules()[0]?.departmentName).toBe("ОАР-2");
    expect(push).toHaveBeenCalled();
  });
});
