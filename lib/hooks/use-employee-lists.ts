"use client";

import { useEmployeeListsContext } from "@/components/providers/EmployeeListsProvider";

export function useEmployeeLists() {
  const { lists, ready, lastError, refresh, save, remove, clearError } =
    useEmployeeListsContext();

  return {
    lists,
    ready,
    lastError,
    refresh,
    save,
    remove,
    clearError,
  };
}
