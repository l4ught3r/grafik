"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  formatDisplayDate,
  getMonthGrid,
  isDateInRange,
  normalizeRange,
  toIsoDate,
} from "@/lib/dates";
import type { VacationPeriod } from "@/lib/types";
import { MONTH_NAMES } from "@/lib/types";
import { cn, generateId } from "@/lib/utils";

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

interface VacationCalendarPickerProps {
  vacations: VacationPeriod[];
  onChange: (vacations: VacationPeriod[]) => void;
  initialYear?: number;
  initialMonth?: number;
}

function getInitialMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function VacationCalendarPicker({
  vacations,
  onChange,
  initialYear,
  initialMonth,
}: VacationCalendarPickerProps) {
  const [{ year, month }, setView] = useState(() => {
    const fallback = getInitialMonth();
    return {
      year: initialYear ?? fallback.year,
      month: initialMonth ?? fallback.month,
    };
  });
  const [anchorDate, setAnchorDate] = useState<string | null>(null);
  const grid = getMonthGrid(year, month);

  const shiftMonth = (delta: number) => {
    setView((current) => {
      const date = new Date(current.year, current.month - 1 + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    });
  };

  const handleDayClick = (day: number) => {
    const date = toIsoDate(year, month, day);

    if (!anchorDate) {
      setAnchorDate(date);
      return;
    }

    const range = normalizeRange(anchorDate, date);
    onChange([
      ...vacations,
      { id: generateId(), from: range.from, to: range.to },
    ]);
    setAnchorDate(null);
  };

  const removeVacation = (id: string) => {
    onChange(vacations.filter((vacation) => vacation.id !== id));
  };

  const completeVacations = vacations.filter(
    (vacation) => vacation.from && vacation.to,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Отпуск</p>
        <p className="text-xs text-muted">
          {anchorDate ? "Выберите дату окончания" : "Выберите дату начала"}
        </p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <div className="mb-3 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<ChevronLeft className="size-4" aria-hidden />}
            onClick={() => shiftMonth(-1)}
            aria-label="Предыдущий месяц"
            className="size-8 px-0"
          />
          <span className="text-sm font-medium">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<ChevronRight className="size-4" aria-hidden />}
            onClick={() => shiftMonth(1)}
            aria-label="Следующий месяц"
            className="size-8 px-0"
          />
        </div>

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
                  aria-hidden
                />
              );
            }

            const date = toIsoDate(year, month, day);
            const isAnchor = anchorDate === date;
            const inSavedVacation = completeVacations.some((vacation) =>
              isDateInRange(date, vacation.from, vacation.to),
            );

            return (
              <button
                key={date}
                type="button"
                onClick={() => handleDayClick(day)}
                className={cn(
                  "size-8 rounded-lg text-xs font-medium transition-colors",
                  inSavedVacation &&
                    "bg-accent-soft text-primary hover:bg-accent-soft/80",
                  isAnchor && "bg-primary text-white shadow-sm",
                  !inSavedVacation &&
                    !isAnchor &&
                    "text-foreground hover:bg-weekend",
                )}
                aria-label={date}
                aria-pressed={inSavedVacation || isAnchor}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {completeVacations.length > 0 && (
        <div className="space-y-1.5">
          {completeVacations.map((vacation) => (
            <div
              key={vacation.id}
              className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 text-xs"
            >
              <span>
                {formatDisplayDate(vacation.from)} —{" "}
                {formatDisplayDate(vacation.to)}
              </span>
              <button
                type="button"
                onClick={() => removeVacation(vacation.id)}
                aria-label="Удалить период отпуска"
                className="rounded p-1 text-muted hover:bg-weekend hover:text-danger"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
