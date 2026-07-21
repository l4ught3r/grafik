"use client";

import { CalendarDays, ChevronDown, Clock, Palmtree, X } from "lucide-react";
import type { ReactNode } from "react";
import { DutyPreferencesFields } from "@/components/forms/DutyPreferencesFields";
import { MonthPlanCalendar } from "@/components/forms/MonthPlanCalendar";
import { ShiftTypePicker } from "@/components/forms/ShiftTypePicker";
import { VacationFields } from "@/components/forms/VacationFields";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Popover } from "@/components/ui/Popover";
import { formatDutyPreferencesSummary } from "@/lib/duty";
import { countConfiguredMonthPlanDays } from "@/lib/month-plan";
import type {
  DutyPreference,
  MonthPlan,
  ShiftType,
  VacationPeriod,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatVacationsSummary } from "@/lib/vacation";

interface EmployeeCardProps {
  index: number;
  name: string;
  shiftType?: ShiftType;
  dutyPreferences?: DutyPreference[];
  monthPlan?: MonthPlan;
  vacations?: VacationPeriod[];
  showVacations?: boolean;
  scheduleYear?: number;
  scheduleMonth?: number;
  onNameChange: (name: string) => void;
  onShiftTypeChange: (shiftType: ShiftType) => void;
  onDutyPreferencesChange?: (preferences: DutyPreference[]) => void;
  onMonthPlanChange?: (monthPlan: MonthPlan | undefined) => void;
  onVacationsChange?: (vacations: VacationPeriod[]) => void;
  onRemove: () => void;
}

interface PopoverChipProps {
  open: boolean;
  toggle: () => void;
  icon: ReactNode;
  label: string;
  configured: boolean;
  ariaLabel: string;
  title?: string;
  disabled?: boolean;
  tone: "duty" | "vacation" | "plan";
}

const CHIP_TONES = {
  duty: {
    configured: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
    idle: "border-border bg-surface text-muted hover:border-sky-200 hover:bg-sky-50/70 hover:text-sky-700",
    openRing: "ring-sky-200",
    iconConfigured: "text-sky-600",
    iconIdle: "text-sky-500/55",
  },
  vacation: {
    configured:
      "border-emerald-200 bg-success-soft text-success hover:bg-emerald-100",
    idle: "border-border bg-surface text-muted hover:border-emerald-200 hover:bg-success-soft/70 hover:text-success",
    openRing: "ring-emerald-200",
    iconConfigured: "text-success",
    iconIdle: "text-emerald-500/55",
  },
  plan: {
    configured:
      "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    idle: "border-border bg-surface text-muted hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-indigo-700",
    openRing: "ring-indigo-200",
    iconConfigured: "text-indigo-600",
    iconIdle: "text-indigo-500/55",
  },
} as const;

function PopoverChip({
  open,
  toggle,
  icon,
  label,
  configured,
  ariaLabel,
  title,
  disabled = false,
  tone,
}: PopoverChipProps) {
  const styles = CHIP_TONES[tone];

  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        toggle();
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-expanded={disabled ? undefined : open}
      title={title}
      className={cn(
        "inline-flex h-8 w-[5.5rem] shrink-0 items-center justify-center gap-1 rounded-lg border px-1.5 text-xs font-medium transition-colors",
        disabled &&
          "cursor-not-allowed border-border bg-surface text-muted opacity-40",
        !disabled && (configured ? styles.configured : styles.idle),
        !disabled && open && cn("ring-1", styles.openRing),
      )}
    >
      <span
        className={cn(
          "inline-flex shrink-0",
          !disabled && (configured ? styles.iconConfigured : styles.iconIdle),
        )}
      >
        {icon}
      </span>
      <span>{label}</span>
      <ChevronDown
        className={cn(
          "size-3 shrink-0 opacity-60 transition-transform",
          open && !disabled && "rotate-180",
        )}
        aria-hidden
      />
    </button>
  );
}

function buildGridColumns(
  showVacations: boolean,
  showDuty: boolean,
  showMonthPlan: boolean,
): string {
  const columns = ["2rem", "minmax(0,1fr)", "5.5rem"];
  if (showDuty) columns.push("5.5rem");
  if (showMonthPlan) columns.push("5.5rem");
  if (showVacations) columns.push("5.5rem");
  columns.push("2rem");
  return columns.join(" ");
}

export function EmployeeCard({
  index,
  name,
  shiftType,
  dutyPreferences = [],
  monthPlan,
  vacations = [],
  showVacations = false,
  scheduleYear,
  scheduleMonth,
  onNameChange,
  onShiftTypeChange,
  onDutyPreferencesChange,
  onMonthPlanChange,
  onVacationsChange,
  onRemove,
}: EmployeeCardProps) {
  const showDuty = onDutyPreferencesChange != null;
  const showMonthPlan = onMonthPlanChange != null;
  const showVacationControls = showVacations && onVacationsChange != null;
  const dutySummary = formatDutyPreferencesSummary(dutyPreferences);
  const vacationSummary = formatVacationsSummary(vacations);
  const dutyEnabled = shiftType === "day";
  const monthPlanEnabled =
    (shiftType === "day" || shiftType === "night") &&
    scheduleYear != null &&
    scheduleMonth != null;
  const monthPlanConfigured = countConfiguredMonthPlanDays(monthPlan) > 0;

  return (
    <div
      className="group grid items-center gap-2 px-3 py-2.5 transition-colors hover:bg-background/60"
      style={{
        gridTemplateColumns: buildGridColumns(
          showVacationControls,
          showDuty,
          showMonthPlan,
        ),
      }}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-weekend text-xs font-medium text-muted tabular-nums">
        {index + 1}
      </span>

      <Input
        placeholder="ФИО"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        aria-label="ФИО сотрудника"
        className="h-8 min-w-0 border-transparent bg-transparent px-2 shadow-none hover:border-border focus:border-primary"
      />

      <div className="flex justify-center">
        <ShiftTypePicker value={shiftType} onChange={onShiftTypeChange} />
      </div>

      {showDuty && (
        <div className="flex justify-center">
          {dutyEnabled ? (
            <Popover
              align="end"
              className="w-72"
              trigger={({ open, toggle }) => (
                <PopoverChip
                  open={open}
                  toggle={toggle}
                  tone="duty"
                  icon={<Clock className="size-3.5 shrink-0" aria-hidden />}
                  label="Дежур."
                  configured={dutySummary.configured}
                  title={
                    dutySummary.configured
                      ? dutySummary.label
                      : "Настройки дежурств"
                  }
                  ariaLabel="Настройки дежурств"
                />
              )}
            >
              <DutyPreferencesFields
                preferences={dutyPreferences}
                onChange={onDutyPreferencesChange}
                layout="panel"
              />
            </Popover>
          ) : (
            <PopoverChip
              open={false}
              toggle={() => {}}
              disabled
              tone="duty"
              icon={<Clock className="size-3.5 shrink-0" aria-hidden />}
              label="Дежур."
              configured={false}
              title="Доступно только для дневной смены"
              ariaLabel="Настройки дежурств"
            />
          )}
        </div>
      )}

      {showMonthPlan && (
        <div className="flex justify-center">
          {monthPlanEnabled ? (
            <Popover
              align="end"
              className="w-80"
              trigger={({ open, toggle }) => (
                <PopoverChip
                  open={open}
                  toggle={toggle}
                  tone="plan"
                  icon={
                    <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                  }
                  label="План"
                  configured={monthPlanConfigured}
                  title={
                    monthPlanConfigured
                      ? `Зафиксировано дней: ${countConfiguredMonthPlanDays(monthPlan)}`
                      : "Пожелания на месяц"
                  }
                  ariaLabel="Пожелания на месяц"
                />
              )}
            >
              <MonthPlanCalendar
                monthPlan={monthPlan}
                onChange={onMonthPlanChange}
                year={scheduleYear}
                month={scheduleMonth}
                shiftType={shiftType === "night" ? "night" : "day"}
              />
            </Popover>
          ) : (
            <PopoverChip
              open={false}
              toggle={() => {}}
              disabled
              tone="plan"
              icon={<CalendarDays className="size-3.5 shrink-0" aria-hidden />}
              label="План"
              configured={false}
              title="Доступно для дневной и ночной смены"
              ariaLabel="Пожелания на месяц"
            />
          )}
        </div>
      )}

      {showVacationControls && (
        <div className="flex justify-center">
          <Popover
            align="end"
            className="w-72"
            trigger={({ open, toggle }) => (
              <PopoverChip
                open={open}
                toggle={toggle}
                tone="vacation"
                icon={<Palmtree className="size-3.5 shrink-0" aria-hidden />}
                label="Отпуск"
                configured={vacationSummary.configured}
                title={
                  vacationSummary.configured
                    ? vacationSummary.label
                    : "Периоды отпуска"
                }
                ariaLabel="Периоды отпуска"
              />
            )}
          >
            <VacationFields
              vacations={vacations}
              onChange={onVacationsChange}
              layout="panel"
              scheduleYear={scheduleYear}
              scheduleMonth={scheduleMonth}
            />
          </Popover>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        icon={<X className="size-4" aria-hidden />}
        onClick={onRemove}
        aria-label="Удалить сотрудника"
        className="size-8 shrink-0 justify-self-center px-0 text-muted/70 hover:text-danger"
      />
    </div>
  );
}
