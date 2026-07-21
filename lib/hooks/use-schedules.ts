"use client";

import { useSchedulesContext } from "@/components/providers/SchedulesProvider";

export function useSchedules() {
  const { schedules, ready, lastError, refresh, save, remove, clearError } =
    useSchedulesContext();

  return {
    schedules,
    ready,
    lastError,
    refresh,
    save,
    remove,
    clearError,
  };
}
