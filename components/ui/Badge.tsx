import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "success" | "warning" | "danger";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variant === "default" && "bg-weekend text-muted",
        variant === "primary" && "bg-accent-soft text-primary",
        variant === "success" && "bg-success-soft text-success",
        variant === "warning" && "bg-warning-soft text-warning",
        variant === "danger" && "bg-danger-soft text-danger",
        className,
      )}
      {...props}
    />
  );
}
