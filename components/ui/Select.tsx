import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const SELECT_CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, style, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-10 w-full appearance-none rounded-lg border border-border bg-surface bg-[length:1rem_1rem] bg-[position:right_0.75rem_center] bg-no-repeat px-3 pr-9 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
        className,
      )}
      style={{ backgroundImage: SELECT_CHEVRON, ...style }}
      {...props}
    >
      {children}
    </select>
  );
}
