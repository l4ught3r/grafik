"use client";

import type { LucideIcon } from "lucide-react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { useId } from "react";
import { SHIFT_TYPE_LABELS, type ShiftType } from "@/lib/types";
import { cn } from "@/lib/utils";

const SHIFT_OPTIONS: {
  value: ShiftType;
  icon: LucideIcon;
  selected: string;
  hover: string;
  iconSelected: string;
  iconIdle: string;
}[] = [
  {
    value: "day",
    icon: Sun,
    selected: "bg-warning-soft shadow-sm ring-1 ring-inset ring-warning/25",
    hover: "hover:bg-warning-soft/70",
    iconSelected: "text-warning",
    iconIdle: "text-amber-500/50",
  },
  {
    value: "night",
    icon: Moon,
    selected: "bg-indigo-50 shadow-sm ring-1 ring-inset ring-indigo-200",
    hover: "hover:bg-indigo-50/80",
    iconSelected: "text-indigo-600",
    iconIdle: "text-indigo-500/50",
  },
  {
    value: "aux",
    icon: SunMoon,
    selected: "bg-violet-50 shadow-sm ring-1 ring-inset ring-violet-200",
    hover: "hover:bg-violet-50/80",
    iconSelected: "text-violet-600",
    iconIdle: "text-violet-500/50",
  },
];

interface ShiftTypePickerProps {
  value?: ShiftType;
  onChange: (value: ShiftType) => void;
  className?: string;
}

export function ShiftTypePicker({
  value,
  onChange,
  className,
}: ShiftTypePickerProps) {
  const groupId = useId();

  return (
    <fieldset
      className={cn(
        "m-0 inline-flex w-full shrink-0 gap-0.5 rounded-xl border border-border/80 bg-surface p-0.5",
        className,
      )}
    >
      <legend className="sr-only">Тип смены</legend>
      {SHIFT_OPTIONS.map(
        ({
          value: optionValue,
          icon: Icon,
          selected,
          hover,
          iconSelected,
          iconIdle,
        }) => {
          const isSelected = value === optionValue;
          const label = SHIFT_TYPE_LABELS[optionValue];

          return (
            <label
              key={optionValue}
              title={label}
              className={cn(
                "inline-flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-lg py-1.5 transition-all",
                isSelected ? selected : cn("bg-transparent", hover),
              )}
            >
              <input
                type="radio"
                name={groupId}
                value={optionValue}
                checked={isSelected}
                onChange={() => onChange(optionValue)}
                className="sr-only"
                aria-label={label}
              />
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isSelected ? iconSelected : iconIdle,
                )}
                aria-hidden
                strokeWidth={isSelected ? 2.25 : 2}
              />
            </label>
          );
        },
      )}
    </fieldset>
  );
}
