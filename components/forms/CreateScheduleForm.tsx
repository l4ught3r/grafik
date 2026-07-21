"use client";

import { Moon, Sun, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { EmployeeRow } from "@/components/forms/EmployeeRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/providers/ToastProvider";
import { AnimatedResize } from "@/components/ui/AnimatedCollapse";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { generateScheduleCells } from "@/lib/generator";
import { useEmployeeLists } from "@/lib/hooks/use-employee-lists";
import { useSchedules } from "@/lib/hooks/use-schedules";
import { getBaseRate } from "@/lib/hours";
import type {
  DraftScheduleEmployee,
  EmployeeList,
  ScheduleEmployee,
} from "@/lib/types";
import { MONTH_NAMES } from "@/lib/types";
import { cn, formatHours, generateId, sortByName } from "@/lib/utils";

function createEmptyEmployee(): DraftScheduleEmployee {
  return {
    id: generateId(),
    name: "",
    vacations: [],
    dutyPreferences: [],
  };
}

function membersToEmployees(
  members: EmployeeList["members"],
): DraftScheduleEmployee[] {
  return sortByName(members)
    .filter((m) => m.name.trim())
    .map((member) => ({
      id: member.id,
      name: member.name.trim(),
      ...(member.shiftType ? { shiftType: member.shiftType } : {}),
      vacations: [],
      dutyPreferences: member.dutyPreferences ?? [],
    }));
}

function isSameEmployeeSet(
  current: DraftScheduleEmployee[],
  loaded: DraftScheduleEmployee[],
): boolean {
  if (current.length !== loaded.length) return false;
  return loaded.every(
    (employee, index) =>
      current[index]?.id === employee.id &&
      current[index]?.name === employee.name &&
      current[index]?.shiftType === employee.shiftType,
  );
}

export function CreateScheduleForm() {
  const router = useRouter();
  const now = new Date();
  const { save } = useSchedules();
  const { error: showError } = useToast();

  const [departmentName, setDepartmentName] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState<DraftScheduleEmployee[]>([]);
  const [dayMin, setDayMin] = useState(0);
  const [nightMin, setNightMin] = useState(0);
  const { lists: employeeLists, ready: listsReady } = useEmployeeLists();
  const [selectedListId, setSelectedListId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    department?: boolean;
    coverage?: boolean;
    employees?: boolean;
  }>({});
  const departmentInputRef = useRef<HTMLInputElement>(null);
  const coverageFieldsRef = useRef<HTMLDivElement>(null);
  const dayMinInputRef = useRef<HTMLInputElement>(null);

  const baseRate = getBaseRate(year, month);

  const scrollToField = (element: HTMLElement | null) => {
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
    ) {
      element.focus({ preventScroll: true });
    }
  };

  const clearCoverageError = (nextDayMin: number, nextNightMin: number) => {
    if (errors.coverage && (nextDayMin > 0 || nextNightMin > 0)) {
      setErrors((prev) => ({ ...prev, coverage: false }));
    }
  };

  const handleListSelect = (listId: string) => {
    setSelectedListId(listId);

    if (!listId) {
      setEmployees([]);
      return;
    }

    const list = employeeLists.find((l) => l.id === listId);
    if (!list) return;

    const loaded = membersToEmployees(list.members);
    if (isSameEmployeeSet(employees, loaded)) return;

    setEmployees(loaded);
    if (loaded.length > 0) {
      setErrors((prev) => ({ ...prev, employees: false }));
    }
  };

  const addEmployee = () => {
    setEmployees([...employees, createEmptyEmployee()]);
  };

  const updateEmployee = (index: number, employee: DraftScheduleEmployee) => {
    const updated = [...employees];
    updated[index] = employee;
    setEmployees(updated);
    if (errors.employees) {
      setErrors((prev) => ({ ...prev, employees: false }));
    }
  };

  const removeEmployee = (index: number) => {
    setEmployees(employees.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const namedEmployees = employees.filter((emp) => emp.name.trim());
    const newErrors = {
      department: !departmentName.trim(),
      coverage: dayMin === 0 && nightMin === 0,
      employees:
        namedEmployees.length === 0 ||
        namedEmployees.some((emp) => !emp.shiftType),
    };

    if (newErrors.department || newErrors.coverage || newErrors.employees) {
      setErrors(newErrors);
      if (newErrors.department) {
        scrollToField(departmentInputRef.current);
      } else if (newErrors.coverage) {
        scrollToField(coverageFieldsRef.current);
        dayMinInputRef.current?.focus({ preventScroll: true });
      }
      return;
    }

    const validEmployees = namedEmployees.filter(
      (emp): emp is ScheduleEmployee => emp.shiftType !== undefined,
    );

    setLoading(true);

    const id = generateId();
    const nowIso = new Date().toISOString();

    const cells = generateScheduleCells({
      year,
      month,
      employees: validEmployees,
      coverage: { dayMin, nightMin },
    });

    const schedule = {
      id,
      departmentName: departmentName.trim(),
      month,
      year,
      employees: validEmployees,
      coverage: { dayMin, nightMin },
      cells,
      ...(selectedListId ? { sourceListId: selectedListId } : {}),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const result = save(schedule);
    setLoading(false);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    router.push(`/schedules/${id}`);
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i);

  return (
    <>
      <PageHeader
        title="Новый график"
        description="Настройте параметры и состав отделения, затем сгенерируйте смены"
        actions={
          <Link href="/schedules">
            <Button type="button" variant="secondary">
              Отмена
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <section
          aria-labelledby="create-metadata-title"
          className="overflow-hidden rounded-2xl border border-border bg-surface"
        >
          <div className="border-b border-border px-6 py-4">
            <h2
              id="create-metadata-title"
              className="text-base font-semibold text-foreground"
            >
              Основные данные
            </h2>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div>
              <Label htmlFor="department" className="mb-1.5 block">
                Отделение
              </Label>
              <Input
                ref={departmentInputRef}
                id="department"
                placeholder="Название отделения"
                value={departmentName}
                onChange={(e) => {
                  setDepartmentName(e.target.value);
                  if (errors.department) {
                    setErrors((prev) => ({ ...prev, department: false }));
                  }
                }}
                className={cn(
                  "h-10",
                  errors.department &&
                    "border-danger focus:border-danger focus:ring-danger/20",
                )}
              />
              {errors.department && (
                <p className="mt-1.5 text-xs text-danger">
                  Укажите название отделения
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[9rem] flex-1">
                <Label htmlFor="month" className="mb-1.5 block">
                  Месяц
                </Label>
                <Select
                  id="month"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="h-10"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-[7rem] flex-1 sm:max-w-[8rem]">
                <Label htmlFor="year" className="mb-1.5 block">
                  Год
                </Label>
                <Select
                  id="year"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="h-10"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
              <p className="pb-2.5 text-sm text-muted">
                Ставка:{" "}
                <span className="font-medium text-foreground">
                  {formatHours(baseRate)} ч
                </span>
              </p>
            </div>

            <section
              ref={coverageFieldsRef}
              aria-labelledby="create-coverage-title"
              className={cn(
                "rounded-xl border border-border bg-background p-4",
                errors.coverage && "ring-2 ring-danger/20",
              )}
            >
              <h3
                id="create-coverage-title"
                className="mb-3 text-sm font-medium text-foreground"
              >
                Минимальное покрытие смен
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label
                    htmlFor="dayMin"
                    className="mb-1.5 flex items-center gap-2"
                  >
                    <Sun className="size-4 text-amber-500" aria-hidden />
                    Дневные смены
                  </Label>
                  <Input
                    ref={dayMinInputRef}
                    id="dayMin"
                    type="number"
                    min={0}
                    value={dayMin}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setDayMin(value);
                      clearCoverageError(value, nightMin);
                    }}
                    className={cn(
                      "h-10",
                      errors.coverage &&
                        "border-danger focus:border-danger focus:ring-danger/20",
                    )}
                  />
                  <p className="mt-1 text-xs text-muted">
                    Минимум сотрудников на дневную смену в рабочий день
                  </p>
                </div>
                <div>
                  <Label
                    htmlFor="nightMin"
                    className="mb-1.5 flex items-center gap-2"
                  >
                    <Moon className="size-4 text-indigo-500" aria-hidden />
                    Ночные смены
                  </Label>
                  <Input
                    id="nightMin"
                    type="number"
                    min={0}
                    value={nightMin}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setNightMin(value);
                      clearCoverageError(dayMin, value);
                    }}
                    className={cn(
                      "h-10",
                      errors.coverage &&
                        "border-danger focus:border-danger focus:ring-danger/20",
                    )}
                  />
                  <p className="mt-1 text-xs text-muted">
                    Минимум сотрудников на ночную смену каждый день
                  </p>
                </div>
              </div>
              {errors.coverage && (
                <p className="mt-3 text-xs text-danger">
                  Укажите минимум сотрудников хотя бы для одной смены
                </p>
              )}
            </section>
          </div>
        </section>

        <section
          aria-labelledby="create-employees-title"
          className="overflow-hidden rounded-2xl border border-border bg-surface"
        >
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted" aria-hidden />
              <h2
                id="create-employees-title"
                className="text-base font-semibold text-foreground"
              >
                Состав отделения
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              {employees.length > 0
                ? `${employees.length} сотрудников в списке`
                : "Добавьте сотрудников вручную или загрузите из списка"}
            </p>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div>
              <Label htmlFor="employee-list" className="mb-1.5 block">
                Список сотрудников
              </Label>
              <Select
                id="employee-list"
                value={selectedListId}
                onChange={(e) => handleListSelect(e.target.value)}
                disabled={!listsReady}
                className="h-10"
              >
                <option value="">Выбрать список сотрудников</option>
                {employeeLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </Select>
            </div>

            <AnimatedResize
              className={cn(
                errors.employees && "rounded-xl ring-2 ring-danger/20",
              )}
            >
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {employees.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted">
                    Нет сотрудников — добавьте первого
                  </p>
                ) : (
                  employees.map((emp, index) => (
                    <EmployeeRow
                      key={emp.id}
                      index={index}
                      employee={emp}
                      scheduleYear={year}
                      scheduleMonth={month}
                      onChange={(updated) => updateEmployee(index, updated)}
                      onRemove={() => removeEmployee(index)}
                    />
                  ))
                )}
              </div>
            </AnimatedResize>
            {errors.employees && (
              <p className="text-xs text-danger">
                Добавьте сотрудников с ФИО и выберите тип смены для каждого
              </p>
            )}

            <Button type="button" variant="secondary" onClick={addEmployee}>
              + Добавить сотрудника
            </Button>
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" loading={loading}>
            Сгенерировать график
          </Button>
        </div>
      </form>
    </>
  );
}
