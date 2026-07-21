"use client";

import type { ReactNode } from "react";
import { EmployeeListsProvider } from "@/components/providers/EmployeeListsProvider";
import { SchedulesProvider } from "@/components/providers/SchedulesProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SchedulesProvider>
      <EmployeeListsProvider>
        <ToastProvider>{children}</ToastProvider>
      </EmployeeListsProvider>
    </SchedulesProvider>
  );
}
