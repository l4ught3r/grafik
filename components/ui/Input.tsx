import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
});
