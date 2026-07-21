import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-10 px-4 text-sm",
        variant === "primary" && "bg-primary text-white hover:bg-primary-hover",
        variant === "secondary" &&
          "border border-border bg-surface text-foreground hover:bg-background",
        variant === "ghost" && "text-muted hover:bg-weekend",
        variant === "danger" &&
          "border border-danger/20 bg-surface text-danger hover:bg-danger-soft",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner
          size="sm"
          className={variant === "primary" ? "text-white" : "text-current"}
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
