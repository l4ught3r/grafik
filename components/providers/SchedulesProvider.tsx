"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStorageSync } from "@/lib/hooks/use-storage-sync";
import {
  deleteSchedule,
  ensureDefaultSchedules,
  getSchedules,
  SCHEDULES_STORAGE_KEY,
  type StorageWriteResult,
  writeSchedules,
} from "@/lib/storage";
import type { Schedule } from "@/lib/types";

const SCHEDULES_SYNC_KEYS = [SCHEDULES_STORAGE_KEY];

function sortSchedules(schedules: Schedule[]): Schedule[] {
  return [...schedules].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

interface SchedulesContextValue {
  schedules: Schedule[];
  ready: boolean;
  lastError: string | null;
  refresh: () => void;
  save: (schedule: Schedule) => StorageWriteResult;
  remove: (id: string) => StorageWriteResult;
  getById: (id: string) => Schedule | undefined;
  clearError: () => void;
}

const SchedulesContext = createContext<SchedulesContextValue | null>(null);

export function SchedulesProvider({ children }: { children: ReactNode }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [ready, setReady] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const schedulesRef = useRef<Schedule[]>([]);

  const refresh = useCallback(() => {
    const next = sortSchedules(getSchedules());
    schedulesRef.current = next;
    setSchedules(next);
  }, []);

  useEffect(() => {
    ensureDefaultSchedules();
    refresh();
    setReady(true);
  }, [refresh]);

  useStorageSync(refresh, SCHEDULES_SYNC_KEYS);

  const save = useCallback((schedule: Schedule): StorageWriteResult => {
    const updated = { ...schedule, updatedAt: new Date().toISOString() };
    const prev = schedulesRef.current;
    const index = prev.findIndex((item) => item.id === schedule.id);
    const next = sortSchedules(
      index >= 0
        ? prev.map((item, i) => (i === index ? updated : item))
        : [...prev, updated],
    );

    const result = writeSchedules(next);
    if (!result.ok) {
      setLastError(result.error);
      return result;
    }

    schedulesRef.current = next;
    setSchedules(next);
    setLastError(null);
    return result;
  }, []);

  const remove = useCallback((id: string): StorageWriteResult => {
    const prev = schedulesRef.current;
    const next = prev.filter((item) => item.id !== id);
    const result = deleteSchedule(id, prev);
    if (!result.ok) {
      setLastError(result.error);
      return result;
    }

    schedulesRef.current = next;
    setSchedules(next);
    setLastError(null);
    return result;
  }, []);

  const getById = useCallback(
    (id: string) => schedules.find((item) => item.id === id),
    [schedules],
  );

  const clearError = useCallback(() => setLastError(null), []);

  const value = useMemo(
    () => ({
      schedules,
      ready,
      lastError,
      refresh,
      save,
      remove,
      getById,
      clearError,
    }),
    [schedules, ready, lastError, refresh, save, remove, getById, clearError],
  );

  return (
    <SchedulesContext.Provider value={value}>
      {children}
    </SchedulesContext.Provider>
  );
}

export function useSchedulesContext(): SchedulesContextValue {
  const context = useContext(SchedulesContext);
  if (!context) {
    throw new Error(
      "useSchedulesContext must be used within SchedulesProvider",
    );
  }
  return context;
}
