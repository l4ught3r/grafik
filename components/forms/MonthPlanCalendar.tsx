"use client";

import { getMonthCalendar } from "@/lib/calendar";
import { getMonthGrid } from "@/lib/dates";
import { getShiftOptionsForDay, SHIFT_HOURS } from "@/lib/hours";
import {
  countConfiguredMonthPlanDays,
  setMonthPlanDay,
} from "@/lib/month-plan";
import type { CalendarDay, MonthPlan } from "@/lib/types";
import { MONTH_NAMES } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

interface MonthPlanCalendarProps {
  monthPlan?: MonthPlan;
  onChange: (monthPlan: MonthPlan | undefined) => void;
  year: number;
  month: number;
  shiftType: "day" | "night";
}

function formatPlanValue(hours: number | undefined): string {
  if (hours == null) return "";
  if (hours === SHIFT_HOURS.shift24 || hours === SHIFT_HOURS.nightWeekend) {
    return "24";
  }
  return String(hours).replace(".", ",");
}

/** Опции для помесячного плана (на выходных day можно зафиксировать 24). */
function getMonthPlanOptions(
  shiftType: "day" | "night",
  calendarDay: CalendarDay,
): number[] {
  if (shiftType === "day" && !calendarDay.isWorkingDay) {
    return [SHIFT_HOURS.shift24];
  }
  return getShiftOptionsForDay(shiftType, calendarDay);
}

/** пусто → смены → 24 → сброс (выходные: пусто → 24 → сброс) */
function cyclePlanValue(
  current: number | undefined,
  options: number[],
): number | undefined {
  const uniqueOptions = [...new Set(options)];
  if (uniqueOptions.length === 0) return undefined;
  const sequence: Array<number | undefined> = [undefined, ...uniqueOptions];
  const index = current == null ? 0 : sequence.indexOf(current);
  const safeIndex = index >= 0 ? index : 0;
  return sequence[(safeIndex + 1) % sequence.length];
}

export function MonthPlanCalendar({
  monthPlan,
  onChange,
  year,
  month,
  shiftType,
}: MonthPlanCalendarProps) {
  const grid = getMonthGrid(year, month);
  const calendar = getMonthCalendar(year, month);
  const configured = countConfiguredMonthPlanDays(monthPlan);

  const handleDayClick = (day: number) => {
    const calendarDay = calendar.find((item) => item.day === day);
    if (!calendarDay) return;

    const options = getMonthPlanOptions(shiftType, calendarDay);
    if (options.length === 0) return;

    const current =
      monthPlan != null && day in monthPlan && monthPlan[day] != null
        ? monthPlan[day]
        : undefined;
    const next = cyclePlanValue(current ?? undefined, options);
    onChange(setMonthPlanDay(monthPlan, day, next));
  };

  const hint =
    shiftType === "day"
      ? "Клик: смена → 24 → сброс. На выходных: 24 → сброс. Зафиксированные дни генератор не меняет."
      : "Клик: смена → сутки → сброс. На выходных: 24 → сброс. Зафиксированные дни генератор не меняет.";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">План на месяц</p>
        <p className="text-xs text-muted">
          {MONTH_NAMES[month - 1]} {year}
          {configured > 0 ? ` · ${configured}` : ""}
        </p>
      </div>
      <p className="text-xs text-muted">{hint}</p>

      <div className="rounded-lg border border-border p-3">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[11px] font-medium text-muted"
            >
              {label}
            </div>
          ))}
          {grid.map((day, index) => {
            const week = Math.floor(index / 7);
            const weekday = index % 7;

            if (day == null) {
              return (
                <div
                  key={`empty-${year}-${month}-${week}-${weekday}`}
                  className="h-9"
                  aria-hidden
                />
              );
            }

            const calendarDay = calendar.find((item) => item.day === day);
            const hours =
              monthPlan != null && day in monthPlan && monthPlan[day] != null
                ? monthPlan[day]
                : undefined;
            const locked = hours != null;
            const label = formatPlanValue(hours);

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDayClick(day)}
                title={locked ? `${hours} ч` : "Не задано"}
                className={cn(
                  "flex h-9 flex-col items-center justify-center rounded-md text-[11px] transition-colors",
                  calendarDay && !calendarDay.isWorkingDay && "text-muted",
                  locked
                    ? "bg-indigo-50 font-medium text-indigo-700 ring-1 ring-indigo-200"
                    : "hover:bg-background",
                )}
              >
                <span className="leading-none tabular-nums">{day}</span>
                {label ? (
                  <span className="leading-none tabular-nums opacity-80">
                    {label}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
