"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useStorageSync } from "@/lib/hooks/use-storage-sync";
import {
  deleteEmployeeList,
  EMPLOYEE_LISTS_STORAGE_KEY,
  ensureDefaultEmployeeLists,
  getEmployeeLists,
  type StorageWriteResult,
  saveEmployeeList,
} from "@/lib/storage";
import type { EmployeeList } from "@/lib/types";

interface EmployeeListsContextValue {
  lists: EmployeeList[];
  ready: boolean;
  lastError: string | null;
  refresh: () => void;
  save: (list: EmployeeList) => StorageWriteResult;
  remove: (id: string) => StorageWriteResult;
  getById: (id: string) => EmployeeList | undefined;
  clearError: () => void;
}

const EmployeeListsContext = createContext<EmployeeListsContextValue | null>(
  null,
);

export function EmployeeListsProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<EmployeeList[]>([]);
  const [ready, setReady] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLists(getEmployeeLists());
  }, []);

  useEffect(() => {
    ensureDefaultEmployeeLists();
    refresh();
    setReady(true);
  }, [refresh]);

  useStorageSync(refresh, [EMPLOYEE_LISTS_STORAGE_KEY]);

  const save = useCallback(
    (list: EmployeeList): StorageWriteResult => {
      const { result } = saveEmployeeList(list);
      if (!result.ok) {
        setLastError(result.error);
        return result;
      }
      setLastError(null);
      refresh();
      return result;
    },
    [refresh],
  );

  const remove = useCallback(
    (id: string): StorageWriteResult => {
      const result = deleteEmployeeList(id);
      if (!result.ok) {
        setLastError(result.error);
        return result;
      }
      setLastError(null);
      refresh();
      return result;
    },
    [refresh],
  );

  const getById = useCallback(
    (id: string) => lists.find((item) => item.id === id),
    [lists],
  );

  const clearError = useCallback(() => setLastError(null), []);

  const value = useMemo(
    () => ({
      lists,
      ready,
      lastError,
      refresh,
      save,
      remove,
      getById,
      clearError,
    }),
    [lists, ready, lastError, refresh, save, remove, getById, clearError],
  );

  return (
    <EmployeeListsContext.Provider value={value}>
      {children}
    </EmployeeListsContext.Provider>
  );
}

export function useEmployeeListsContext(): EmployeeListsContextValue {
  const context = useContext(EmployeeListsContext);
  if (!context) {
    throw new Error(
      "useEmployeeListsContext must be used within EmployeeListsProvider",
    );
  }
  return context;
}
