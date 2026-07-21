"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { type ToastItem, ToastViewport } from "@/components/ui/Toast";
import { generateId } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastOptions {
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = generateId();
      const variant = options?.variant ?? "info";
      const durationMs = options?.durationMs ?? DEFAULT_DURATION_MS;

      setToasts((prev) => [...prev, { id, message, variant }]);

      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message) => toast(message, { variant: "success" }),
      error: (message) => toast(message, { variant: "error" }),
      info: (message) => toast(message, { variant: "info" }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
