"use client";

import { useEffect, useState } from "react";
import {
  getDutyCountPreference,
  MAX_DUTIES_PER_WEEK,
  WEEKDAY_OPTIONS,
} from "@/lib/duty";
import type { DutyPreference } from "@/lib/types";
import { cn } from "@/lib/utils";

type DutyMode = "weekdays" | "count";

interface DutyPreferencesFieldsProps {
  preferences: DutyPreference[];
  onChange: (preferences: DutyPreference[]) => void;
  layout?: "inline" | "panel";
}

function getModeFromPreferences(preferences: DutyPreference[]): DutyMode {
  if (preferences.some((preference) => preference.weekday != null)) {
    return "weekdays";
  }
  if (getDutyCountPreference(preferences)) {
    return "count";
  }
  return "count";
}

export function DutyPreferencesFields({
  preferences,
  onChange,
  layout = "inline",
}: DutyPreferencesFieldsProps) {
  const [mode, setMode] = useState<DutyMode>(() =>
    getModeFromPreferences(preferences),
  );
  const countPreference = getDutyCountPreference(preferences);
  const selectedWeekdays = new Set(
    preferences
      .filter((p) => p.weekday != null)
      .map((p) => p.weekday as number),
  );
  const isPanel = layout === "panel";

  useEffect(() => {
    if (preferences.some((preference) => preference.weekday != null)) {
      setMode("weekdays");
      return;
    }
    if (getDutyCountPreference(preferences)) {
      setMode("count");
    }
  }, [preferences]);

  const setModeAndPreferences = (nextMode: DutyMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    if (nextMode === "count") {
      onChange([
        { weekday: null, timesPerWeek: countPreference?.timesPerWeek ?? 1 },
      ]);
      return;
    }
    onChange(preferences.filter((preference) => preference.weekday != null));
  };

  const toggleWeekday = (weekday: number) => {
    if (selectedWeekdays.has(weekday)) {
      onChange(preferences.filter((p) => p.weekday !== weekday));
      return;
    }

    onChange(
      [...preferences, { weekday, timesPerWeek: 1 }].sort((a, b) => {
        if (a.weekday == null) return 1;
        if (b.weekday == null) return -1;
        return a.weekday - b.weekday;
      }),
    );
  };

  const setCount = (timesPerWeek: number) => {
    if (timesPerWeek <= 0) {
      onChange([]);
      return;
    }
    onChange([{ weekday: null, timesPerWeek }]);
  };

  return (
    <div
      className={cn(
        isPanel
          ? "space-y-3"
          : "flex shrink-0 flex-nowrap items-center gap-1.5",
      )}
    >
      {!isPanel && (
        <span className="whitespace-nowrap text-xs text-muted">
          Дежурства (24 ч)
        </span>
      )}
      {isPanel && (
        <p className="text-sm font-medium text-foreground">Дежурства (24 ч)</p>
      )}
      <div
        className={cn(
          "flex rounded-lg border border-border p-0.5",
          isPanel && "w-fit",
        )}
      >
        <button
          type="button"
          onClick={() => setModeAndPreferences("count")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "count"
              ? "bg-primary text-white shadow-sm"
              : "text-muted hover:bg-weekend",
          )}
        >
          Кол-во
        </button>
        <button
          type="button"
          onClick={() => setModeAndPreferences("weekdays")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "weekdays"
              ? "bg-primary text-white shadow-sm"
              : "text-muted hover:bg-weekend",
          )}
        >
          Дни
        </button>
      </div>
      {mode === "weekdays" ? (
        <div className={cn("flex gap-1", isPanel && "flex-wrap")}>
          {WEEKDAY_OPTIONS.map((option) => {
            const selected = selectedWeekdays.has(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleWeekday(option.value)}
                className={cn(
                  "size-8 rounded-lg text-xs font-medium transition-colors",
                  selected
                    ? "bg-primary text-white shadow-sm"
                    : "border border-border bg-background text-muted hover:bg-weekend",
                )}
                aria-label={option.label}
                aria-pressed={selected}
                title={option.label}
              >
                {option.short}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-1">
          {Array.from({ length: MAX_DUTIES_PER_WEEK }, (_, i) => i + 1).map(
            (count) => {
              const selected = countPreference?.timesPerWeek === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => setCount(selected ? 0 : count)}
                  className={cn(
                    "size-8 rounded-lg text-xs font-medium transition-colors",
                    selected
                      ? "bg-primary text-white shadow-sm"
                      : "border border-border bg-background text-muted hover:bg-weekend",
                  )}
                  aria-label={`${count} дежурств в неделю`}
                  aria-pressed={selected}
                  title={`${count} в неделю`}
                >
                  {count}
                </button>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
