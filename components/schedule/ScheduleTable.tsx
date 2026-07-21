"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CoverageLabel } from "@/components/schedule/CoverageLabel";
import {
  ScheduleCell,
  type ShiftDragData,
} from "@/components/schedule/ScheduleCell";
import {
  type CellMenuTarget,
  ScheduleCellMenu,
} from "@/components/schedule/ScheduleCellMenu";
import { ScheduleShiftDragGhost } from "@/components/schedule/ScheduleShiftDragGhost";
import { getMonthCalendar } from "@/lib/calendar";
import { getDayCoverageStatus, hasCoverageRequirements } from "@/lib/coverage";
import { useScheduleShiftDrag } from "@/lib/hooks/use-schedule-shift-drag";
import {
  getBaseRate,
  getEmployeeRateFraction,
  getTargetHours,
  isBelowBaseRate,
  sumEmployeeHoursForMonth,
} from "@/lib/hours";
import {
  clearScheduleHoverHighlight,
  createScheduleHoverState,
  findScheduleHoverCell,
  updateScheduleHoverHighlight,
} from "@/lib/schedule-table-highlight";
import { isSickDay } from "@/lib/sick-days";
import { MONTH_NAMES, type Schedule } from "@/lib/types";
import { cn, formatHours, formatRate } from "@/lib/utils";
import {
  formatVacationSpanLabel,
  getVacationSpanForDay,
  getVacationSpanLength,
  getVacationSpansInMonth,
  isDayInVacation,
} from "@/lib/vacation-spans";

interface ScheduleTableProps {
  schedule: Schedule;
  lastChanged: { employeeId: string; day: number } | null;
  onCellChange: (employeeId: string, day: number, hours: number | null) => void;
  onSickToggle: (employeeId: string, day: number) => void;
  onCellMove: (from: ShiftDragData, to: ShiftDragData) => void;
  className?: string;
}

export function ScheduleTable({
  schedule,
  lastChanged,
  onCellChange,
  onSickToggle,
  onCellMove,
  className,
}: ScheduleTableProps) {
  const calendar = getMonthCalendar(schedule.year, schedule.month);
  const baseRate = getBaseRate(schedule.year, schedule.month);
  const targetHours = getTargetHours(schedule.year, schedule.month);
  const showCoverage = hasCoverageRequirements(schedule);
  const tableRef = useRef<HTMLTableElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const hoverStateRef = useRef(createScheduleHoverState());
  const isDraggingRef = useRef(false);
  const [menuTarget, setMenuTarget] = useState<CellMenuTarget | null>(null);

  const clearHoverHighlight = useCallback(() => {
    const table = tableRef.current;
    if (!table) return;
    clearScheduleHoverHighlight(table, hoverStateRef.current);
  }, []);

  const handleDragStateChange = useCallback(
    (isDragging: boolean) => {
      isDraggingRef.current = isDragging;
      if (isDragging) {
        clearHoverHighlight();
        setMenuTarget(null);
      }
    },
    [clearHoverHighlight],
  );

  useScheduleShiftDrag({
    tableRef,
    scrollRef,
    ghostRef,
    schedule,
    onCellMove,
    onDragStateChange: handleDragStateChange,
  });

  const handleTablePointer = (
    event:
      | React.MouseEvent<HTMLTableElement>
      | React.FocusEvent<HTMLTableElement>,
  ) => {
    if (isDraggingRef.current) return;

    const table = tableRef.current;
    const cell = findScheduleHoverCell(event.target);
    if (!table || !cell) return;

    updateScheduleHoverHighlight(table, cell, hoverStateRef.current);
  };

  const handleTableMouseLeave = () => {
    const table = tableRef.current;
    if (!table) return;
    clearScheduleHoverHighlight(table, hoverStateRef.current);
  };

  const handleTableBlur = (event: React.FocusEvent<HTMLTableElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;

    const table = tableRef.current;
    if (!table) return;
    clearScheduleHoverHighlight(table, hoverStateRef.current);
  };

  const handleCloseMenu = useCallback(() => {
    setMenuTarget(null);
  }, []);

  const handleMenuSelectHours = useCallback(
    (employeeId: string, day: number, hours: number | null) => {
      onCellChange(employeeId, day, hours);
    },
    [onCellChange],
  );

  const handleMenuSelectSick = useCallback(
    (employeeId: string, day: number) => {
      onSickToggle(employeeId, day);
    },
    [onSickToggle],
  );

  return (
    <div
      className={cn(
        "schedule-table-card overflow-visible rounded-xl border border-border bg-surface shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none",
        className,
      )}
    >
      <div className="schedule-table-header hidden border-b border-border bg-accent-soft px-6 py-5 print:block print:px-2 print:py-1">
        <h2 className="schedule-table-title text-center text-xl font-semibold tracking-tight text-foreground print:text-base print:leading-tight">
          {schedule.departmentName}
        </h2>
        <p className="schedule-table-subtitle mt-1.5 text-center text-sm text-muted print:mt-0 print:text-xs print:leading-tight">
          {MONTH_NAMES[schedule.month - 1]} {schedule.year}
          <span className="mx-2 text-border">·</span>
          Ставка:{" "}
          <span className="font-medium text-foreground">
            {formatHours(baseRate)} ч
          </span>
        </p>
      </div>

      <div ref={scrollRef} className="schedule-table-scroll">
        <table
          ref={tableRef}
          className="schedule-interactive-table w-full min-w-max border-collapse text-xs"
          onMouseOver={handleTablePointer}
          onMouseLeave={handleTableMouseLeave}
          onFocus={handleTablePointer}
          onBlur={handleTableBlur}
        >
          <thead>
            <tr className="bg-background">
              <th className="schedule-sticky-cell sticky left-0 z-20 hidden border border-border-strong bg-background px-2 py-2 text-left font-semibold text-muted sm:table-cell">
                №
              </th>
              <th className="schedule-sticky-cell sticky left-0 z-20 min-w-[120px] border border-border-strong bg-background px-2 py-2 text-left font-semibold text-muted sm:left-8 sm:min-w-[140px]">
                ФИО
              </th>
              {calendar.map((d) => (
                <th
                  key={d.day}
                  data-day={d.day}
                  className={cn(
                    "border border-border-strong px-0.5 py-2 font-semibold tabular-nums text-muted sm:px-1",
                    !d.isWorkingDay &&
                      !d.isHoliday &&
                      "bg-weekend-strong text-foreground/80",
                    d.isHoliday && "bg-holiday-strong text-primary",
                  )}
                >
                  {d.day}
                </th>
              ))}
              <th className="border border-border-strong bg-background px-2 py-2 font-semibold text-muted">
                Итого
              </th>
              <th className="border border-border-strong bg-background px-2 py-2 font-semibold text-muted">
                Ставка
              </th>
              <th className="border border-border-strong bg-background px-2 py-2 font-semibold text-muted">
                Разница
              </th>
            </tr>
          </thead>
          <tbody>
            {schedule.employees.map((emp, index) => {
              const empCells = schedule.cells[emp.id] ?? {};
              const total = sumEmployeeHoursForMonth(
                empCells,
                emp.vacations,
                calendar,
              );
              const diff = total - baseRate;
              const employeeRate = getEmployeeRateFraction(total, baseRate);
              const belowRate = isBelowBaseRate(
                total,
                schedule.year,
                schedule.month,
              );
              const aboveTarget = total > targetHours;
              const vacationSpans = getVacationSpansInMonth(
                schedule.year,
                schedule.month,
                emp.vacations,
              );
              const hasVacationThisMonth = vacationSpans.length > 0;
              const showHoursAlert = !hasVacationThisMonth;
              const alertBelow = showHoursAlert && belowRate;
              const alertAbove = showHoursAlert && aboveTarget && !belowRate;
              const alertTitle = alertBelow
                ? `Часов ниже ставки на ${formatHours(baseRate - total)}`
                : alertAbove
                  ? `Часов выше целевого потолка на ${formatHours(total - targetHours)}`
                  : undefined;
              return (
                <tr key={emp.id} data-employee-id={emp.id}>
                  <td className="schedule-sticky-cell sticky left-0 z-10 hidden border border-border-strong px-2 py-1 tabular-nums text-muted sm:table-cell">
                    {index + 1}
                  </td>
                  <td
                    title={alertTitle}
                    className={cn(
                      "schedule-sticky-cell schedule-name-cell sticky left-0 z-10 border border-border-strong px-2 py-1 font-medium sm:left-8",
                      alertBelow && "schedule-alert-cell schedule-alert-below",
                      alertAbove && "schedule-alert-cell schedule-alert-above",
                    )}
                  >
                    {emp.name}
                  </td>
                  {calendar.map((d) => {
                    const vacationSpan = getVacationSpanForDay(
                      d.day,
                      vacationSpans,
                    );
                    const vacationOverlay = vacationSpan
                      ? {
                          label: formatVacationSpanLabel(
                            vacationSpan.from,
                            vacationSpan.to,
                          ),
                          spanLength: getVacationSpanLength(vacationSpan),
                          isSpanStart: d.day === vacationSpan.startDay,
                        }
                      : undefined;

                    return (
                      <ScheduleCell
                        key={d.day}
                        employeeId={emp.id}
                        calendarDay={d}
                        hours={empCells[d.day]}
                        isVacation={isDayInVacation(d.day, vacationSpans)}
                        vacationOverlay={vacationOverlay}
                        isSick={isSickDay(schedule.sickDays, emp.id, d.day)}
                        isJustChanged={
                          lastChanged?.employeeId === emp.id &&
                          lastChanged?.day === d.day
                        }
                        isMenuOpen={
                          menuTarget?.employeeId === emp.id &&
                          menuTarget?.day === d.day
                        }
                        onOpenMenu={setMenuTarget}
                      />
                    );
                  })}
                  <td
                    title={alertTitle}
                    className={cn(
                      "schedule-summary-cell border border-border-strong px-2 py-1 text-center font-semibold tabular-nums",
                      alertBelow && "schedule-alert-cell schedule-alert-below",
                      alertAbove && "schedule-alert-cell schedule-alert-above",
                    )}
                  >
                    {formatHours(total)}
                  </td>
                  <td
                    title={alertTitle}
                    className={cn(
                      "schedule-summary-cell border border-border-strong px-2 py-1 text-center tabular-nums text-muted",
                      alertBelow && "schedule-alert-cell schedule-alert-below",
                      alertAbove && "schedule-alert-cell schedule-alert-above",
                    )}
                  >
                    {formatRate(employeeRate)}
                  </td>
                  <td
                    className={cn(
                      "schedule-summary-cell border border-border-strong px-2 py-1 text-center font-medium tabular-nums",
                      alertBelow && "schedule-alert-cell schedule-alert-below",
                      alertAbove && "schedule-alert-cell schedule-alert-above",
                      diff < 0 && "text-rose-600",
                      diff > targetHours - baseRate && "text-amber-600",
                      diff >= 0 &&
                        diff <= targetHours - baseRate &&
                        "text-emerald-600",
                    )}
                    title={alertTitle}
                  >
                    {diff >= 0 ? "+" : ""}
                    {formatHours(diff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {showCoverage && (
            <tfoot className="schedule-coverage-footer">
              <tr>
                <td
                  colSpan={2}
                  className="schedule-sticky-cell schedule-coverage-footer-label sticky bottom-0 left-0 z-30 border border-border-strong bg-background px-2 py-1 text-[10px] font-semibold text-muted"
                >
                  Покрытие
                </td>
                {calendar.map((d) => (
                  <td
                    key={d.day}
                    data-day={d.day}
                    className={cn(
                      "sticky bottom-0 z-20 border border-border-strong bg-background px-1 py-1 text-center",
                      !d.isWorkingDay && !d.isHoliday && "bg-weekend-strong",
                      d.isHoliday && "bg-holiday-strong",
                    )}
                  >
                    <CoverageLabel status={getDayCoverageStatus(schedule, d)} />
                  </td>
                ))}
                <td
                  className="sticky bottom-0 z-20 border border-border-strong bg-background"
                  colSpan={3}
                />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <ScheduleCellMenu
        target={menuTarget}
        onSelectHours={handleMenuSelectHours}
        onSelectSick={handleMenuSelectSick}
        onClose={handleCloseMenu}
      />
      {typeof document !== "undefined" &&
        createPortal(<ScheduleShiftDragGhost ref={ghostRef} />, document.body)}
    </div>
  );
}
