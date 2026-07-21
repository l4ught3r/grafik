"use client";

import { Moon, Sun, Users, X } from "lucide-react";
import { EmployeeRow } from "@/components/forms/EmployeeRow";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { useScheduleEmployeesEditor } from "@/lib/hooks/use-schedule-employees-editor";
import type { Schedule } from "@/lib/types";

interface ScheduleEmployeesModalProps {
  schedule: Schedule;
  open: boolean;
  onClose: () => void;
  onChange: (schedule: Schedule) => void;
}

export function ScheduleEmployeesModal({
  schedule,
  open,
  onClose,
  onChange,
}: ScheduleEmployeesModalProps) {
  const {
    lists,
    setSyncListId,
    activeListId,
    dayMin,
    setDayMin,
    nightMin,
    setNightMin,
    handleEmployeeChange,
    handleRemove,
    handleAdd,
    applyCoverage,
    handleSyncToList,
  } = useScheduleEmployeesEditor({ schedule, onChange, open });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:hidden">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="employees-modal-title"
        className="relative flex max-h-[min(92vh,880px)] w-full max-w-4xl flex-col overflow-clip rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2
              id="employees-modal-title"
              className="text-lg font-semibold text-foreground"
            >
              Сотрудники и покрытие
            </h2>
            <p className="mt-1 text-sm text-muted">
              {schedule.employees.length} сотрудников в графике
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Закрыть"
            icon={<X className="size-4" aria-hidden />}
          />
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <section
            aria-labelledby="coverage-section-title"
            className="rounded-xl border border-border bg-background p-4"
          >
            <h3
              id="coverage-section-title"
              className="mb-3 text-sm font-medium text-foreground"
            >
              Минимальное покрытие смен
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label
                  htmlFor="modal-dayMin"
                  className="mb-1.5 flex items-center gap-2"
                >
                  <Sun className="size-4 text-amber-500" aria-hidden />
                  Дневные смены
                </Label>
                <Input
                  id="modal-dayMin"
                  type="number"
                  min={0}
                  value={dayMin}
                  onChange={(e) => setDayMin(Number(e.target.value))}
                  onBlur={applyCoverage}
                  className="h-10"
                />
                <p className="mt-1 text-xs text-muted">
                  Минимум сотрудников на дневную смену в рабочий день
                </p>
              </div>
              <div>
                <Label
                  htmlFor="modal-nightMin"
                  className="mb-1.5 flex items-center gap-2"
                >
                  <Moon className="size-4 text-indigo-500" aria-hidden />
                  Ночные смены
                </Label>
                <Input
                  id="modal-nightMin"
                  type="number"
                  min={0}
                  value={nightMin}
                  onChange={(e) => setNightMin(Number(e.target.value))}
                  onBlur={applyCoverage}
                  className="h-10"
                />
                <p className="mt-1 text-xs text-muted">
                  Минимум сотрудников на ночную смену каждый день
                </p>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="sync-section-title"
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <Label htmlFor="modal-sync-list" className="mb-1.5 block">
                Список для синхронизации
              </Label>
              <Select
                id="modal-sync-list"
                value={activeListId}
                onChange={(e) => setSyncListId(e.target.value)}
              >
                <option value="">Выберите список</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSyncToList}
              disabled={!activeListId}
            >
              Сохранить в список
            </Button>
          </section>

          <section aria-labelledby="employees-section-title">
            <div className="mb-3 flex items-center gap-2">
              <Users className="size-4 text-muted" aria-hidden />
              <h3
                id="employees-section-title"
                className="text-sm font-medium text-foreground"
              >
                Состав отделения
              </h3>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {schedule.employees.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">
                  Нет сотрудников — добавьте первого
                </p>
              ) : (
                schedule.employees.map((employee, index) => (
                  <EmployeeRow
                    key={employee.id}
                    index={index}
                    employee={employee}
                    scheduleYear={schedule.year}
                    scheduleMonth={schedule.month}
                    onChange={(updated) =>
                      handleEmployeeChange(index, {
                        ...updated,
                        shiftType: updated.shiftType ?? "day",
                      })
                    }
                    onRemove={() => handleRemove(index)}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-background/80 px-6 py-4">
          <Button type="button" variant="secondary" onClick={handleAdd}>
            + Добавить сотрудника
          </Button>
          <Button type="button" onClick={onClose}>
            Готово
          </Button>
        </div>
      </div>
    </div>
  );
}
