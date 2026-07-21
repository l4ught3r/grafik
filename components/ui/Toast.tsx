"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastItem {
  id: string;
  message: string;
  variant: "success" | "error" | "info";
}

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const variantStyles = {
  success: "border-success/30 bg-success-soft text-success",
  error: "border-danger/30 bg-danger-soft text-danger",
  info: "border-border bg-surface text-foreground",
} as const;

const variantIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-2 print:hidden"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((item) => {
        const Icon = variantIcons[item.variant];
        return (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg",
              variantStyles[item.variant],
            )}
          >
            <output className="flex flex-1 items-start gap-2 border-0 bg-transparent p-0">
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="flex-1 leading-snug">{item.message}</span>
            </output>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
              aria-label="Закрыть"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
