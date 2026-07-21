"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import type { CellMenuTarget } from "@/components/schedule/ScheduleCellMenu";
import { getMotionTransition } from "@/lib/motion-tokens";
import type { CalendarDay } from "@/lib/types";
import { cn, formatHours } from "@/lib/utils";

export interface ShiftDragData {
  employeeId: string;
  day: number;
}

interface ScheduleCellProps {
  employeeId: string;
  calendarDay: CalendarDay;
  hours: number | null | undefined;
  isVacation?: boolean;
  vacationOverlay?: {
    label: string;
    spanLength: number;
    isSpanStart: boolean;
  };
  isSick: boolean;
  isJustChanged?: boolean;
  isMenuOpen?: boolean;
  onOpenMenu: (target: CellMenuTarget) => void;
}

export function ScheduleCell({
  employeeId,
  calendarDay,
  hours,
  isVacation = false,
  vacationOverlay,
  isSick,
  isJustChanged = false,
  isMenuOpen = false,
  onOpenMenu,
}: ScheduleCellProps) {
  const reduceMotion = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canDrag = !isVacation && !isSick && hours != null;

  const handleClick = () => {
    if (!buttonRef.current) return;
    onOpenMenu({
      employeeId,
      day: calendarDay.day,
      hours,
      isSick,
      calendarDay,
      anchor: buttonRef.current,
    });
  };

  if (isVacation) {
    const showOverlay =
      vacationOverlay?.isSpanStart && vacationOverlay.spanLength > 0;

    return (
      <td
        data-schedule-cell
        data-employee-id={employeeId}
        data-day={calendarDay.day}
        data-vacation="true"
        data-sick="false"
        className={cn(
          "relative overflow-visible border border-border-strong p-0 text-center",
          "bg-amber-100",
          !calendarDay.isWorkingDay && "bg-amber-200/70",
          showOverlay ? "z-[2]" : "z-[1]",
        )}
      >
        <div
          className="h-7 w-full min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
          aria-hidden
        />
        {showOverlay && (
          <span
            className="pointer-events-none absolute top-1/2 z-20 whitespace-nowrap text-[10px] font-semibold text-amber-900"
            style={{
              left: `${(vacationOverlay.spanLength / 2) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {vacationOverlay.label}
          </span>
        )}
      </td>
    );
  }

  const isHoliday = calendarDay.isHoliday;
  const isNonWorking = !calendarDay.isWorkingDay;

  return (
    <td
      data-schedule-cell
      data-employee-id={employeeId}
      data-day={calendarDay.day}
      data-vacation="false"
      data-sick={isSick ? "true" : "false"}
      {...(hours != null ? { "data-hours": String(hours) } : {})}
      className={cn(
        "relative border border-border-strong p-0 text-center",
        isSick && "bg-info-soft text-info",
        !isSick && isNonWorking && !isHoliday && "bg-weekend-strong",
        !isSick && isHoliday && "bg-holiday-strong",
        isMenuOpen && "ring-2 ring-inset ring-primary",
        isJustChanged && "ring-2 ring-inset ring-primary",
      )}
    >
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          "flex h-7 w-full min-h-11 min-w-11 items-center justify-center px-1 tabular-nums text-foreground sm:min-h-0 sm:min-w-0",
          isSick && "text-xs font-semibold text-info",
          !isSick && hours == null && "text-muted/50",
          !isSick && hours != null && hours >= 24 && "font-semibold",
          canDrag && "touch-none cursor-grab active:cursor-grabbing",
        )}
        onClick={handleClick}
      >
        {isSick ? (
          "б/л"
        ) : hours != null ? (
          isJustChanged && !reduceMotion ? (
            <motion.span
              key={`${hours}-flash`}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={getMotionTransition("fast")}
            >
              {formatHours(hours)}
            </motion.span>
          ) : (
            formatHours(hours)
          )
        ) : (
          <span aria-hidden className="select-none">
            ·
          </span>
        )}
      </button>
    </td>
  );
}
