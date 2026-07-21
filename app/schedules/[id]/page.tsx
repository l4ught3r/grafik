"use client";

import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { ShiftDragData } from "@/components/schedule/ScheduleCell";
import { ScheduleEditorHeader } from "@/components/schedule/ScheduleEditorHeader";
import { ScheduleEmployeesModal } from "@/components/schedule/ScheduleEmployeesModal";
import { SchedulePageSkeleton } from "@/components/schedule/SchedulePageSkeleton";
import { ScheduleRegeneratingOverlay } from "@/components/schedule/ScheduleRegeneratingOverlay";
import { ScheduleStatusBar } from "@/components/schedule/ScheduleStatusBar";
import { ScheduleTable } from "@/components/schedule/ScheduleTable";
import { ScheduleToolbar } from "@/components/schedule/ScheduleToolbar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMonthCalendar, isDateInVacation } from "@/lib/calendar";
import { moveCell, setCellHours } from "@/lib/cells";
import { useScheduleEditor } from "@/lib/hooks/use-schedule-editor";
import { clearSickDay, isSickDay, toggleSickDay } from "@/lib/sick-days";
import { cn } from "@/lib/utils";

export default function SchedulePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : null;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [employeesModalOpen, setEmployeesModalOpen] = useState(false);

  const {
    schedule,
    lastChanged,
    isRegenerating,
    updateSchedule,
    handleRegenerate,
    markCellChanged,
    remove,
  } = useScheduleEditor(id ?? "");

  const handleCellChange = (
    employeeId: string,
    day: number,
    hours: number | null,
  ) => {
    if (!schedule) return;

    let sickDays = schedule.sickDays;
    if (hours != null && isSickDay(sickDays, employeeId, day)) {
      sickDays = clearSickDay(sickDays, employeeId, day);
    }

    updateSchedule({
      ...schedule,
      cells: setCellHours(schedule.cells, employeeId, day, hours),
      sickDays,
    });
    markCellChanged(employeeId, day);
  };

  const handleSickToggle = (employeeId: string, day: number) => {
    if (!schedule) return;

    const calendar = getMonthCalendar(schedule.year, schedule.month);
    const calendarDay = calendar.find((d) => d.day === day);
    const employee = schedule.employees.find((e) => e.id === employeeId);
    if (
      !calendarDay ||
      !employee ||
      isDateInVacation(calendarDay.date, employee.vacations)
    ) {
      return;
    }

    const { cells, sickDays } = toggleSickDay(
      schedule.cells,
      schedule.sickDays,
      employeeId,
      day,
    );

    updateSchedule({ ...schedule, cells, sickDays });
    markCellChanged(employeeId, day);
  };

  const handleCellMove = (from: ShiftDragData, to: ShiftDragData) => {
    if (!schedule) return;

    const calendar = getMonthCalendar(schedule.year, schedule.month);
    const toDay = calendar.find((d) => d.day === to.day);
    const toEmployee = schedule.employees.find((e) => e.id === to.employeeId);

    if (
      !toDay ||
      !toEmployee ||
      isDateInVacation(toDay.date, toEmployee.vacations) ||
      isSickDay(schedule.sickDays, to.employeeId, to.day)
    ) {
      return;
    }

    const nextCells = moveCell(schedule.cells, from, to);
    if (!nextCells) return;

    updateSchedule({ ...schedule, cells: nextCells });
    markCellChanged(to.employeeId, to.day);
  };

  const handleDelete = () => {
    const result = remove();
    if (!result.ok) return;
    router.push("/schedules");
  };

  if (id === null) {
    return (
      <main className="mx-auto flex max-w-lg flex-1 items-center px-4 py-16">
        <EmptyState
          icon={FileQuestion}
          title="График не найден"
          description="Некорректная ссылка на график."
          action={
            <Link href="/schedules">
              <Button variant="secondary">К списку графиков</Button>
            </Link>
          }
          className="w-full"
        />
      </main>
    );
  }

  if (schedule === undefined) {
    return <SchedulePageSkeleton />;
  }

  if (!schedule) {
    return (
      <main className="mx-auto flex max-w-lg flex-1 items-center px-4 py-16">
        <EmptyState
          icon={FileQuestion}
          title="График не найден"
          description="Возможно, он был удалён или ссылка неверна."
          action={
            <Link href="/schedules">
              <Button variant="secondary">К списку графиков</Button>
            </Link>
          }
          className="w-full"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1800px] px-4 py-3 print:max-w-none print:p-0">
      <ScheduleEditorHeader schedule={schedule} onChange={updateSchedule} />

      <div className="mt-2 flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <ScheduleToolbar
          schedule={schedule}
          onOpenEmployees={() => setEmployeesModalOpen(true)}
          onRegenerate={() => setRegenerateOpen(true)}
          isRegenerating={isRegenerating}
          onDelete={() => setDeleteOpen(true)}
          className="flex-1"
        />
      </div>

      <div className="mt-2">
        <ScheduleStatusBar schedule={schedule} />
      </div>

      <div
        id="schedule-print-area"
        className={cn(
          "relative mt-2 transition-opacity duration-150 ease-out",
          isRegenerating && "pointer-events-none opacity-60",
        )}
      >
        <ScheduleRegeneratingOverlay visible={isRegenerating} />
        <ScheduleTable
          schedule={schedule}
          lastChanged={lastChanged}
          onCellChange={handleCellChange}
          onSickToggle={handleSickToggle}
          onCellMove={handleCellMove}
        />
      </div>

      <ScheduleEmployeesModal
        schedule={schedule}
        open={employeesModalOpen}
        onClose={() => setEmployeesModalOpen(false)}
        onChange={updateSchedule}
      />

      <Dialog
        open={regenerateOpen}
        onClose={() => setRegenerateOpen(false)}
        title="Перегенерировать график?"
        description="Все ручные правки ячеек будут заменены новой автогенерацией. Сотрудники, отпуска и больничные сохранятся."
        confirmLabel="Перегенерировать"
        onConfirm={handleRegenerate}
      />

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Удалить график?"
        description={`График «${schedule.departmentName}» будет удалён без возможности восстановления.`}
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={handleDelete}
      />
    </main>
  );
}
