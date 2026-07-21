"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { analyzeScheduleQuality } from "@/lib/schedule-quality";
import type { Schedule } from "@/lib/types";
import { formatHours } from "@/lib/utils";

interface ScheduleQualityBannerProps {
  schedule: Schedule;
}

export function ScheduleQualityBanner({
  schedule,
}: ScheduleQualityBannerProps) {
  const [open, setOpen] = useState(true);
  const report = analyzeScheduleQuality(schedule);

  if (!report.hasIssues) return null;

  return (
    <div className="mb-4 rounded-lg border border-border bg-surface print:hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-foreground">
          Замечания по графику
        </span>
        {open ? (
          <ChevronUp className="size-4 text-muted" aria-hidden />
        ) : (
          <ChevronDown className="size-4 text-muted" aria-hidden />
        )}
      </button>

      {open && (
        <div className="space-y-2 border-t border-border px-4 py-3 text-sm text-muted">
          {report.coverageFeasibility.messages.map((message) => (
            <p key={message} className="font-medium text-rose-700">
              {message}
            </p>
          ))}
          {report.daysWithDeficit > 0 && (
            <p className="text-rose-600">
              Дней с дефицитом покрытия: {report.daysWithDeficit}
            </p>
          )}
          {report.daysWithSurplus > 0 && (
            <p className="text-amber-600">
              Дней с избытком покрытия: {report.daysWithSurplus}
            </p>
          )}
          {report.employeesBelowRate.length > 0 && (
            <div>
              <p className="font-medium text-foreground">Ниже ставки:</p>
              <ul className="mt-1 list-inside list-disc">
                {report.employeesBelowRate.map((item) => (
                  <li key={item.id}>
                    {item.name}: {formatHours(item.hours)} (−
                    {formatHours(item.delta)})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.employeesAboveTarget.length > 0 && (
            <div>
              <p className="font-medium text-foreground">
                Выше целевого потолка:
              </p>
              <ul className="mt-1 list-inside list-disc">
                {report.employeesAboveTarget.map((item) => (
                  <li key={item.id}>
                    {item.name}: {formatHours(item.hours)} (+
                    {formatHours(item.delta)})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
