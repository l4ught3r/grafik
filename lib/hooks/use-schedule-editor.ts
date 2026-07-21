"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { useSchedule } from "@/lib/hooks/use-schedule";
import { regenerateSchedule } from "@/lib/schedule-update";
import type { Schedule } from "@/lib/types";

interface ChangedCell {
  employeeId: string;
  day: number;
}

export function useScheduleEditor(id: string) {
  const { schedule: loadedSchedule, save, remove } = useSchedule(id);
  const { error: showError } = useToast();
  const [schedule, setSchedule] = useState<Schedule | null | undefined>(
    undefined,
  );
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [lastChanged, setLastChanged] = useState<ChangedCell | null>(null);
  const changeFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    setSchedule((current) => {
      if (
        current != null &&
        loadedSchedule != null &&
        current.id === loadedSchedule.id &&
        current.updatedAt === loadedSchedule.updatedAt
      ) {
        return current;
      }
      return loadedSchedule;
    });
  }, [loadedSchedule]);

  useEffect(() => {
    return () => {
      if (changeFlashTimeoutRef.current) {
        clearTimeout(changeFlashTimeoutRef.current);
      }
    };
  }, []);

  const updateSchedule = useCallback(
    (updated: Schedule) => {
      const result = save(updated);
      if (!result.ok) {
        showError(result.error);
        return;
      }
    },
    [save, showError],
  );

  const markCellChanged = useCallback((employeeId: string, day: number) => {
    if (changeFlashTimeoutRef.current) {
      clearTimeout(changeFlashTimeoutRef.current);
    }
    setLastChanged({ employeeId, day });
    changeFlashTimeoutRef.current = setTimeout(() => {
      setLastChanged(null);
    }, 300);
  }, []);

  const handleRegenerate = useCallback(async () => {
    if (!schedule) return;

    setIsRegenerating(true);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    try {
      updateSchedule(regenerateSchedule(schedule));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Не удалось перегенерировать график";
      showError(message);
    } finally {
      setIsRegenerating(false);
    }
  }, [schedule, updateSchedule, showError]);

  return {
    schedule,
    lastChanged,
    isRegenerating,
    updateSchedule,
    handleRegenerate,
    markCellChanged,
    remove,
  };
}
