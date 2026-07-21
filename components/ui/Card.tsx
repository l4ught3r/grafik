import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  accent?: boolean;
}

export function Card({
  className,
  hover,
  accent,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-6 shadow-sm",
        accent && "border-l-4 border-l-primary",
        hover &&
          "cursor-pointer transition-all hover:border-primary/30 hover:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
