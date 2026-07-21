"use client";

import { useSchedulesContext } from "@/components/providers/SchedulesProvider";

export function useSchedule(id: string) {
  const { ready, save, remove, getById } = useSchedulesContext();
  const schedule = getById(id);

  return {
    schedule: ready ? (schedule ?? null) : undefined,
    save,
    remove: () => remove(id),
  };
}
