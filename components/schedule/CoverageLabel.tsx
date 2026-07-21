import type { DayCoverageStatus } from "@/lib/coverage";
import { formatCoverageTooltip } from "@/lib/coverage";
import { cn } from "@/lib/utils";

interface CoverageLabelProps {
  status: DayCoverageStatus;
}

export function CoverageLabel({ status }: CoverageLabelProps) {
  if (status.items.length === 0) {
    return (
      <span
        className="text-[10px] font-medium text-muted/70"
        title="Покрытие в норме"
      >
        ·
      </span>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-0.5 leading-none"
      title={formatCoverageTooltip(status)}
    >
      {status.items.map((item) => (
        <span
          key={item.type}
          className={cn(
            "text-[10px] font-semibold tabular-nums",
            item.diff < 0 && "text-rose-600",
            item.diff > 0 && "text-amber-600",
          )}
        >
          {item.actual}/{item.required}
        </span>
      ))}
    </div>
  );
}
