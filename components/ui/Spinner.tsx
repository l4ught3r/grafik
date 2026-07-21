import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md";
}

export function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <output
      aria-label="Загрузка"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        size === "sm" && "size-4",
        size === "md" && "size-5",
        className,
      )}
    />
  );
}
