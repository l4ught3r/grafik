"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { useEmployeeLists } from "@/lib/hooks/use-employee-lists";
import {
  addScheduleEmployee,
  applyEmployeeChange,
  applyScheduleMetadata,
  removeScheduleEmployee,
} from "@/lib/schedule-update";
import { syncEmployeesToList } from "@/lib/sync-employee-list";
import type { Schedule, ScheduleEmployee } from "@/lib/types";
import { generateId } from "@/lib/utils";

export function createEmptyScheduleEmployee(): ScheduleEmployee {
  return {
    id: generateId(),
    name: "",
    shiftType: "day",
    vacations: [],
    dutyPreferences: [],
  };
}

interface UseScheduleEmployeesEditorOptions {
  schedule: Schedule;
  onChange: (schedule: Schedule) => void;
  open?: boolean;
}

export function useScheduleEmployeesEditor({
  schedule,
  onChange,
  open = true,
}: UseScheduleEmployeesEditorOptions) {
  const { lists } = useEmployeeLists();
  const { success, error } = useToast();
  const [syncListId, setSyncListId] = useState(schedule.sourceListId ?? "");
  const [dayMin, setDayMin] = useState(schedule.coverage.dayMin);
  const [nightMin, setNightMin] = useState(schedule.coverage.nightMin);

  const activeListId = syncListId || schedule.sourceListId || "";

  useEffect(() => {
    if (!open) return;
    setSyncListId(schedule.sourceListId ?? "");
    setDayMin(schedule.coverage.dayMin);
    setNightMin(schedule.coverage.nightMin);
  }, [open, schedule]);

  const handleEmployeeChange = (index: number, updated: ScheduleEmployee) => {
    onChange(applyEmployeeChange(schedule, index, updated));
  };

  const handleRemove = (index: number) => {
    onChange(removeScheduleEmployee(schedule, index));
  };

  const handleAdd = () => {
    onChange(addScheduleEmployee(schedule, createEmptyScheduleEmployee()));
  };

  const applyCoverage = () => {
    if (
      dayMin === schedule.coverage.dayMin &&
      nightMin === schedule.coverage.nightMin
    ) {
      return;
    }
    onChange(
      applyScheduleMetadata(schedule, {
        coverage: { dayMin, nightMin },
      }),
    );
  };

  const handleSyncToList = () => {
    if (!activeListId) {
      error("Выберите список для сохранения");
      return;
    }

    const result = syncEmployeesToList(activeListId, schedule.employees);
    if (!result.ok) {
      error(result.error);
      return;
    }

    if (result.updated === 0 && result.added === 0) {
      error(
        "В выбранном списке нет совпадений по id, новых сотрудников для добавления нет",
      );
      return;
    }

    if (schedule.sourceListId !== activeListId) {
      onChange(applyScheduleMetadata(schedule, { sourceListId: activeListId }));
    }

    success(`Обновлено: ${result.updated}, добавлено: ${result.added}`);
  };

  return {
    lists,
    syncListId,
    setSyncListId,
    activeListId,
    dayMin,
    setDayMin,
    nightMin,
    setNightMin,
    handleEmployeeChange,
    handleRemove,
    handleAdd,
    applyCoverage,
    handleSyncToList,
  };
}
