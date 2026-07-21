import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ScheduleCell } from "@/components/schedule/ScheduleCell";
import {
  type CellMenuTarget,
  ScheduleCellMenu,
} from "@/components/schedule/ScheduleCellMenu";
import { getMonthCalendar } from "@/lib/calendar";
import type { CalendarDay } from "@/lib/types";

function CellHarness({
  calendarDay,
  hours,
  isSick = false,
  onChange,
  onSickToggle,
}: {
  calendarDay: CalendarDay;
  hours: number | null;
  isSick?: boolean;
  onChange: (hours: number | null) => void;
  onSickToggle?: () => void;
}) {
  const [menuTarget, setMenuTarget] = useState<CellMenuTarget | null>(null);

  return (
    <>
      <table>
        <tbody>
          <tr>
            <ScheduleCell
              employeeId="e1"
              calendarDay={calendarDay}
              hours={hours}
              isSick={isSick}
              isMenuOpen={
                menuTarget?.employeeId === "e1" &&
                menuTarget?.day === calendarDay.day
              }
              onOpenMenu={setMenuTarget}
            />
          </tr>
        </tbody>
      </table>
      <ScheduleCellMenu
        target={menuTarget}
        onSelectHours={(_employeeId, _day, value) => onChange(value)}
        onSelectSick={() => onSickToggle?.()}
        onClose={() => setMenuTarget(null)}
      />
    </>
  );
}

describe("ScheduleCell", () => {
  afterEach(() => {
    cleanup();
  });

  test("открывает меню по клику на заполненной ячейке", async () => {
    const calendar = getMonthCalendar(2025, 4);
    const workDay = calendar.find((day) => day.day === 10);
    if (!workDay) throw new Error("expected work day");

    const onChange = mock(() => {});

    render(
      <CellHarness calendarDay={workDay} hours={7.8} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("option", { name: "—" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  test("открывает меню и выбирает 7.8", async () => {
    const calendar = getMonthCalendar(2025, 4);
    const workDay = calendar.find((day) => day.day === 10);
    if (!workDay) throw new Error("expected work day");

    const onChange = mock(() => {});

    render(
      <CellHarness calendarDay={workDay} hours={null} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("option", { name: "7,8" }));

    expect(onChange).toHaveBeenCalledWith(7.8);
  });

  test("показывает 6.8 в предпраздничный день", async () => {
    const calendar = getMonthCalendar(2025, 4);
    const preHoliday = calendar.find((day) => day.date === "2025-04-30");
    if (!preHoliday) throw new Error("expected pre-holiday day");

    render(
      <CellHarness calendarDay={preHoliday} hours={null} onChange={() => {}} />,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("option", { name: "6,8" })).toBeInTheDocument();
  });

  test("меню содержит пункт больничного", () => {
    const calendar = getMonthCalendar(2025, 4);
    const workDay = calendar.find((day) => day.day === 10);
    if (!workDay) throw new Error("expected work day");

    const onSickToggle = mock(() => {});

    render(
      <CellHarness
        calendarDay={workDay}
        hours={null}
        onChange={() => {}}
        onSickToggle={onSickToggle}
      />,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("option", { name: "Больничный" }));
    expect(onSickToggle).toHaveBeenCalled();
  });
});
