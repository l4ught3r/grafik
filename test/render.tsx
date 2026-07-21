import type { ReactNode } from "react";
import { ClientProviders } from "@/components/providers/ClientProviders";

export function TestProviders({ children }: { children: ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>;
}
