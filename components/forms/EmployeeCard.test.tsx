import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EmployeeCard } from "@/components/forms/EmployeeCard";

const defaultProps = {
  index: 0,
  name: "Иванов",
  shiftType: "day" as const,
  dutyPreferences: [{ weekday: null, timesPerWeek: 2 }],
  vacations: [{ from: "2025-04-01", to: "2025-04-15" }],
  showVacations: true,
  scheduleYear: 2025,
  scheduleMonth: 4,
  onNameChange: () => {},
  onShiftTypeChange: () => {},
  onDutyPreferencesChange: () => {},
  onMonthPlanChange: () => {},
  onVacationsChange: () => {},
  onRemove: () => {},
};

describe("EmployeeCard", () => {
  afterEach(() => {
    cleanup();
  });

  test("статичные подписи отпуска и дежурств", () => {
    render(<EmployeeCard {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: "Периоды отпуска" }),
    ).toHaveTextContent("Отпуск");
    expect(
      screen.getByRole("button", { name: "Настройки дежурств" }),
    ).toHaveTextContent("Дежур.");
    expect(
      screen.getByRole("button", { name: "Периоды отпуска" }),
    ).not.toHaveTextContent("2025");
  });

  test("дежурства disabled для ночной смены", () => {
    render(<EmployeeCard {...defaultProps} shiftType="night" />);

    const dutyButton = screen.getByRole("button", {
      name: "Настройки дежурств",
    });
    expect(dutyButton).toBeDisabled();
    expect(dutyButton).toHaveTextContent("Дежур.");
  });

  test("план на месяц доступен для day и night", () => {
    const { rerender } = render(<EmployeeCard {...defaultProps} />);

    const dayPlan = screen.getByRole("button", { name: "Пожелания на месяц" });
    expect(dayPlan).not.toBeDisabled();
    fireEvent.click(dayPlan);
    expect(screen.getByText("План на месяц")).toBeInTheDocument();

    rerender(<EmployeeCard {...defaultProps} shiftType="night" />);
    const nightPlan = screen.getByRole("button", {
      name: "Пожелания на месяц",
    });
    expect(nightPlan).not.toBeDisabled();

    rerender(<EmployeeCard {...defaultProps} shiftType="aux" />);
    expect(
      screen.getByRole("button", { name: "Пожелания на месяц" }),
    ).toBeDisabled();
  });

  test("дежурства открываются для дневной смены", () => {
    render(<EmployeeCard {...defaultProps} shiftType="day" />);

    const dutyButton = screen.getByRole("button", {
      name: "Настройки дежурств",
    });
    expect(dutyButton).not.toBeDisabled();

    fireEvent.click(dutyButton);
    expect(screen.getByText("Дежурства (24 ч)")).toBeInTheDocument();
  });

  test("слот дежурств есть без отпусков", () => {
    render(
      <EmployeeCard
        {...defaultProps}
        showVacations={false}
        onVacationsChange={undefined}
        shiftType="night"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Настройки дежурств" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Периоды отпуска" }),
    ).not.toBeInTheDocument();
  });
});
