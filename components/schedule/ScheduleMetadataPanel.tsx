"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { isHolidayYearSupported } from "@/lib/holidays/ru";
import {
  applyScheduleMetadata,
  applySchedulePeriodChange,
} from "@/lib/schedule-update";
import type { Schedule } from "@/lib/types";
import { MONTH_NAMES } from "@/lib/types";

interface ScheduleMetadataPanelProps {
  schedule: Schedule;
  open: boolean;
  onChange: (schedule: Schedule) => void;
}

export function ScheduleMetadataPanel({
  schedule,
  open,
  onChange,
}: ScheduleMetadataPanelProps) {
  const now = new Date();
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 1 + i);

  const [departmentName, setDepartmentName] = useState(schedule.departmentName);
  const [dayMin, setDayMin] = useState(schedule.coverage.dayMin);
  const [nightMin, setNightMin] = useState(schedule.coverage.nightMin);
  const [month, setMonth] = useState(schedule.month);
  const [year, setYear] = useState(schedule.year);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);

  if (!open) return null;

  const periodChanged = month !== schedule.month || year !== schedule.year;
  const holidayWarning = !isHolidayYearSupported(year);

  const applyCoverage = () => {
    onChange(
      applyScheduleMetadata(schedule, {
        coverage: { dayMin, nightMin },
      }),
    );
  };

  const applyDepartment = () => {
    const trimmed = departmentName.trim();
    if (!trimmed || trimmed === schedule.departmentName) return;
    onChange(applyScheduleMetadata(schedule, { departmentName: trimmed }));
  };

  const applyPeriod = (regenerate: boolean) => {
    onChange(applySchedulePeriodChange(schedule, month, year, { regenerate }));
    setPeriodDialogOpen(false);
  };

  return (
    <>
      <Card className="mb-4 print:hidden">
        <h2 className="mb-3 text-base font-medium text-foreground">
          Настройки графика
        </h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="meta-department">Отделение</Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="meta-department"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                onBlur={applyDepartment}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="meta-month">Месяц</Label>
              <Select
                id="meta-month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="mt-1"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="meta-year">Год</Label>
              <Select
                id="meta-year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {holidayWarning && (
            <p className="text-xs text-warning">
              Для {year} года нет данных производственного календаря —
              учитываются только суббота и воскресенье.
            </p>
          )}

          {periodChanged && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPeriodDialogOpen(true)}
            >
              Применить период
            </Button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="meta-dayMin">Дневные</Label>
              <Input
                id="meta-dayMin"
                type="number"
                min={0}
                value={dayMin}
                onChange={(e) => setDayMin(Number(e.target.value))}
                onBlur={applyCoverage}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="meta-nightMin">Ночные</Label>
              <Input
                id="meta-nightMin"
                type="number"
                min={0}
                value={nightMin}
                onChange={(e) => setNightMin(Number(e.target.value))}
                onBlur={applyCoverage}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </Card>

      <Dialog
        open={periodDialogOpen}
        onClose={() => setPeriodDialogOpen(false)}
        title="Сменить период графика?"
        description="Ячейки вне нового месяца будут удалены. Можно только обрезать данные или перегенерировать график заново."
        confirmLabel="Применить"
        cancelLabel="Отмена"
        onConfirm={() => applyPeriod(false)}
        secondaryAction={{
          label: "Применить и перегенерировать",
          onClick: () => applyPeriod(true),
        }}
      />
    </>
  );
}
