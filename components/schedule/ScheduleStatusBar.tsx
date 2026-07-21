"use client";

import { AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import {
  analyzeScheduleQuality,
  type ScheduleQualityReport,
} from "@/lib/schedule-quality";
import type { Schedule } from "@/lib/types";
import { cn, formatHours } from "@/lib/utils";

interface ScheduleStatusBarProps {
  schedule: Schedule;
}

function countIssues(report: ScheduleQualityReport): number {
  let count = report.coverageFeasibility.messages.length;
  if (report.daysWithDeficit > 0) count += 1;
  if (report.daysWithSurplus > 0) count += 1;
  count += report.employeesBelowRate.length;
  count += report.employeesAboveTarget.length;
  return count;
}

export function ScheduleStatusBar({ schedule }: ScheduleStatusBarProps) {
  const report = analyzeScheduleQuality(schedule);
  const issueCount = countIssues(report);
  const hasIssues = report.hasIssues;

  return (
    <div className="print:hidden">
      <Popover
        align="start"
        className="min-w-72 p-3"
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label={
              hasIssues
                ? `${issueCount} замечаний по графику`
                : "График в норме"
            }
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-left text-xs transition-colors",
              hasIssues
                ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100/80"
                : "border-border bg-background text-muted hover:bg-accent-soft",
            )}
          >
            <span className="inline-flex items-center gap-1.5 font-medium">
              {hasIssues ? (
                <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
              ) : (
                <CheckCircle2
                  className="size-3.5 shrink-0 text-emerald-600"
                  aria-hidden
                />
              )}
              {hasIssues
                ? `${issueCount} ${issueCount === 1 ? "замечание" : issueCount < 5 ? "замечания" : "замечаний"}`
                : "График в норме"}
            </span>
            {hasIssues && (
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 transition-transform",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            )}
          </button>
        )}
      >
        <div className="space-y-2 text-sm text-muted">
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
          {!hasIssues && (
            <p className="text-emerald-700">
              Проблем с графиком не обнаружено.
            </p>
          )}
        </div>
      </Popover>
    </div>
  );
}
