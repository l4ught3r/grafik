import { describe, expect, test } from "bun:test";
import { getMonthCalendar } from "@/lib/calendar";
import { DUTY_HOURS } from "@/lib/duty";
import { fillDayEmployeeWorkingDays } from "@/lib/fill-day-shifts";
import type { Schedule, ScheduleEmployee } from "@/lib/types";

function createDayEmployee(
  id: string,
  vacations: ScheduleEmployee["vacations"] = [],
): ScheduleEmployee {
  return {
    id,
    name: `Дневной ${id}`,
    shiftType: "day",
    vacations,
    dutyPreferences: [],
  };
}

describe("fillDayEmployeeWorkingDays", () => {
  const year = 2026;
  const month = 6;
  const calendar = getMonthCalendar(year, month);
  const workingDays = calendar.filter((day) => day.isWorkingDay);

  test("дневной без отпуска получает смену на каждый рабочий день", () => {
    const employee = createDayEmployee("d1");
    const cells: Schedule["cells"] = { d1: {} };

    fillDayEmployeeWorkingDays([employee], calendar, cells);

    for (const day of workingDays) {
      expect(cells.d1?.[day.day]).not.toBeNull();
      expect(cells.d1?.[day.day]).not.toBeUndefined();
    }
  });

  test("день дежурства 24ч не дублируется", () => {
    const employee = createDayEmployee("d1");
    const dutyDay = workingDays[0];
    if (!dutyDay) throw new Error("expected working day");

    const cells: Schedule["cells"] = {
      d1: { [dutyDay.day]: DUTY_HOURS },
    };

    fillDayEmployeeWorkingDays([employee], calendar, cells);

    expect(cells.d1?.[dutyDay.day]).toBe(DUTY_HOURS);
    for (const day of workingDays) {
      if (day.day === dutyDay.day) continue;
      expect(cells.d1?.[day.day]).not.toBeNull();
    }
  });

  test("отпускной рабочий день пропускается", () => {
    const vacationDay = workingDays[3];
    if (!vacationDay) throw new Error("expected working day");

    const employee = createDayEmployee("d1", [
      { id: "vac1", from: vacationDay.date, to: vacationDay.date },
    ]);
    const cells: Schedule["cells"] = { d1: {} };

    fillDayEmployeeWorkingDays([employee], calendar, cells);

    expect(cells.d1?.[vacationDay.day]).toBeUndefined();
    for (const day of workingDays) {
      if (day.day === vacationDay.day) continue;
      expect(cells.d1?.[day.day]).not.toBeNull();
    }
  });
});
