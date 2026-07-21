"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { getBaseRate } from "@/lib/hours";
import { applyScheduleMetadata } from "@/lib/schedule-update";
import type { Schedule } from "@/lib/types";
import { MONTH_NAMES } from "@/lib/types";
import { cn, formatHours } from "@/lib/utils";

interface ScheduleEditorHeaderProps {
  schedule: Schedule;
  onChange: (schedule: Schedule) => void;
  className?: string;
}

export function ScheduleEditorHeader({
  schedule,
  onChange,
  className,
}: ScheduleEditorHeaderProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [departmentName, setDepartmentName] = useState(schedule.departmentName);
  const baseRate = getBaseRate(schedule.year, schedule.month);

  useEffect(() => {
    setDepartmentName(schedule.departmentName);
  }, [schedule.departmentName]);

  const applyDepartment = () => {
    const trimmed = departmentName.trim();
    setEditingTitle(false);
    if (!trimmed || trimmed === schedule.departmentName) {
      setDepartmentName(schedule.departmentName);
      return;
    }
    onChange(applyScheduleMetadata(schedule, { departmentName: trimmed }));
  };

  return (
    <header
      className={cn(
        "flex flex-wrap items-baseline gap-x-3 gap-y-1 print:hidden",
        className,
      )}
    >
      {editingTitle ? (
        <Input
          value={departmentName}
          onChange={(e) => setDepartmentName(e.target.value)}
          onBlur={applyDepartment}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyDepartment();
            if (e.key === "Escape") {
              setDepartmentName(schedule.departmentName);
              setEditingTitle(false);
            }
          }}
          className="h-8 max-w-xs text-lg font-semibold"
          autoFocus
          aria-label="Название отделения"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingTitle(true)}
          className="text-left text-lg font-semibold text-foreground hover:text-primary"
          title="Нажмите, чтобы изменить"
        >
          {schedule.departmentName}
        </button>
      )}

      <span className="text-sm text-muted">
        {MONTH_NAMES[schedule.month - 1]} {schedule.year}
      </span>

      <span className="text-sm text-muted">
        Ставка:{" "}
        <span className="font-medium text-foreground">
          {formatHours(baseRate)} ч
        </span>
      </span>
    </header>
  );
}
