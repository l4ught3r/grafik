import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor: string;
  children: ReactNode;
}

export function Label({ className, children, htmlFor, ...props }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("mb-1 block text-sm font-medium text-muted", className)}
      {...props}
    >
      {children}
    </label>
  );
}
