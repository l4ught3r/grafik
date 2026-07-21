import { cn } from "@/lib/utils";

interface ShiftDragOverlayChipProps {
  label: string;
  className?: string;
}

export function ShiftDragOverlayChip({
  label,
  className,
}: ShiftDragOverlayChipProps) {
  return (
    <div
      data-shift-drag-label
      className={cn(
        "flex h-8 min-w-[2.75rem] items-center justify-center rounded-lg",
        "border border-primary/30 bg-surface px-2 text-xs font-semibold text-primary",
        "shadow-lg shadow-primary/15 scale-105",
        className,
      )}
    >
      {label}
    </div>
  );
}
