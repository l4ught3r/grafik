import { forwardRef } from "react";
import { ShiftDragOverlayChip } from "@/components/schedule/ShiftDragOverlayChip";
import { cn } from "@/lib/utils";

export const ScheduleShiftDragGhost = forwardRef<
  HTMLDivElement,
  { className?: string }
>(function ScheduleShiftDragGhost({ className }, ref) {
  return (
    <div
      ref={ref}
      className={cn("schedule-shift-ghost", className)}
      style={{ visibility: "hidden", opacity: 0 }}
      aria-hidden
    >
      <ShiftDragOverlayChip label="" />
    </div>
  );
});
