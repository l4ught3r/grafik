"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SHIFT_HOURS, SHIFT_OPTIONS } from "@/lib/hours";
import { getMotionTransition } from "@/lib/motion-tokens";
import type { CalendarDay } from "@/lib/types";
import { cn, formatHours } from "@/lib/utils";

const MENU_ITEM_HEIGHT = 28;
const MENU_PADDING = 4;

export type CellMenuEntry =
  | { kind: "hours"; label: string; value: number | null }
  | { kind: "sick"; label: string };

export interface CellMenuTarget {
  employeeId: string;
  day: number;
  hours: number | null | undefined;
  isSick: boolean;
  calendarDay: CalendarDay;
  anchor: HTMLButtonElement;
}

interface MenuPosition {
  left: number;
  top: number;
  openAbove: boolean;
}

function buildMenuOptions(
  calendarDay: CalendarDay,
): { label: string; value: number | null }[] {
  const values = new Set<number>([...SHIFT_OPTIONS]);
  if (calendarDay.isPreHoliday && calendarDay.isWorkingDay) {
    values.add(SHIFT_HOURS.dayPreHoliday);
  }
  return [
    { label: "—", value: null },
    ...[...values]
      .sort((a, b) => a - b)
      .map((h) => ({ label: formatHours(h), value: h })),
  ];
}

export function buildCellMenuEntries(
  calendarDay: CalendarDay,
  isSick: boolean,
): CellMenuEntry[] {
  if (isSick) {
    return [{ kind: "sick", label: "Снять б/л" }];
  }

  return [
    ...buildMenuOptions(calendarDay).map((option) => ({
      kind: "hours" as const,
      label: option.label,
      value: option.value,
    })),
    { kind: "sick", label: "Больничный" },
  ];
}

function getMenuPosition(
  button: HTMLButtonElement,
  optionCount: number,
): MenuPosition {
  const rect = button.getBoundingClientRect();
  const menuHeight = optionCount * MENU_ITEM_HEIGHT + MENU_PADDING;
  const spaceBelow = window.innerHeight - rect.bottom;
  const openAbove = spaceBelow < menuHeight && rect.top > spaceBelow;

  return {
    left: rect.left + rect.width / 2,
    top: openAbove ? rect.top - 2 : rect.bottom + 2,
    openAbove,
  };
}

interface ScheduleCellMenuProps {
  target: CellMenuTarget | null;
  onSelectHours: (
    employeeId: string,
    day: number,
    hours: number | null,
  ) => void;
  onSelectSick: (employeeId: string, day: number) => void;
  onClose: () => void;
}

export function ScheduleCellMenu({
  target,
  onSelectHours,
  onSelectSick,
  onClose,
}: ScheduleCellMenuProps) {
  const reduceMotion = useReducedMotion();
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const entries = target
    ? buildCellMenuEntries(target.calendarDay, target.isSick)
    : [];

  useLayoutEffect(() => {
    if (!target) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      setMenuPosition(getMenuPosition(target.anchor, entries.length));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [target, entries.length]);

  useLayoutEffect(() => {
    if (!target) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [target, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {target && menuPosition && (
        <>
          <motion.button
            key="menu-backdrop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={getMotionTransition("fast")}
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Закрыть"
            onClick={onClose}
          />
          <div
            style={{
              position: "fixed",
              left: menuPosition.left,
              top: menuPosition.top,
              transform: menuPosition.openAbove
                ? "translate(-50%, -100%)"
                : "translate(-50%, 0)",
            }}
            className="z-40"
          >
            <motion.div
              key="menu-panel"
              role="listbox"
              initial={
                reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }
              }
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              transition={getMotionTransition("fast")}
              className="min-w-[3.5rem] overflow-hidden rounded-md border border-border bg-surface py-0.5 shadow-lg"
            >
              {entries.map((entry, index) => (
                <button
                  key={`${entry.kind}-${entry.label}`}
                  type="button"
                  role="option"
                  aria-selected={
                    entry.kind === "hours" && target.hours === entry.value
                  }
                  className={cn(
                    "block w-full px-3 py-1 text-center text-xs hover:bg-accent-soft",
                    entry.kind === "sick" &&
                      index > 0 &&
                      "border-t border-border text-rose-700",
                    entry.kind === "hours" &&
                      target.hours === entry.value &&
                      "bg-accent-soft font-medium",
                  )}
                  onClick={() => {
                    if (entry.kind === "sick") {
                      onSelectSick(target.employeeId, target.day);
                    } else {
                      onSelectHours(target.employeeId, target.day, entry.value);
                    }
                    onClose();
                  }}
                >
                  {entry.label}
                </button>
              ))}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
