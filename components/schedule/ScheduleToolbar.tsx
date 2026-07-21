"use client";

import {
  ChevronDown,
  FileDown,
  FileSpreadsheet,
  MoreHorizontal,
  Printer,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { printSchedule } from "@/lib/export/print";
import type { Schedule } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ScheduleToolbarProps {
  schedule: Schedule;
  onOpenEmployees: () => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
  onDelete: () => void;
  className?: string;
}

function ToolbarGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 border-l border-border pl-2 first:border-l-0 first:pl-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ScheduleToolbar({
  schedule,
  onOpenEmployees,
  onRegenerate,
  isRegenerating = false,
  onDelete,
  className,
}: ScheduleToolbarProps) {
  const { success, error: showError } = useToast();
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const fileName = `grafik_${schedule.departmentName}_${schedule.month}_${schedule.year}.pdf`;

  const handlePdf = async () => {
    setIsExportingPdf(true);
    try {
      const { exportScheduleToPdf } = await import("@/lib/export/pdf");
      await exportScheduleToPdf("schedule-print-area", fileName);
      success("PDF сохранён");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось создать PDF";
      showError(message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExcel = async () => {
    setIsExportingExcel(true);
    try {
      const { exportScheduleToExcel } = await import("@/lib/export/excel");
      await exportScheduleToExcel(schedule);
      success("Excel сохранён");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось создать Excel";
      showError(message);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePrint = () => {
    printSchedule();
    success("Открыто окно печати");
  };

  const exportItems = [
    {
      label: "Печать",
      icon: <Printer className="size-4" aria-hidden />,
      onClick: handlePrint,
    },
    {
      label: "PDF",
      icon: <FileDown className="size-4" aria-hidden />,
      onClick: handlePdf,
      disabled: isExportingPdf,
    },
    {
      label: "Excel",
      icon: <FileSpreadsheet className="size-4" aria-hidden />,
      onClick: handleExcel,
      disabled: isExportingExcel,
    },
  ];

  const overflowItems = [
    {
      label: "Удалить график",
      icon: <Trash2 className="size-4" aria-hidden />,
      onClick: onDelete,
      variant: "danger" as const,
    },
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 print:hidden",
        className,
      )}
    >
      <ToolbarGroup>
        <DropdownMenu
          menuLabel="Экспорт"
          items={exportItems}
          trigger={({ open, toggle }) => (
            <Button
              variant="secondary"
              size="sm"
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="menu"
            >
              Экспорт
              <ChevronDown className="size-3.5" aria-hidden />
            </Button>
          )}
        />
      </ToolbarGroup>

      <ToolbarGroup className="sm:ml-auto">
        <Button
          variant="secondary"
          size="sm"
          icon={<Users className="size-4" aria-hidden />}
          onClick={onOpenEmployees}
        >
          <span className="hidden sm:inline">Сотрудники</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="size-4" aria-hidden />}
          onClick={onRegenerate}
          loading={isRegenerating}
        >
          <span className="hidden sm:inline">Перегенерировать</span>
        </Button>
      </ToolbarGroup>

      <ToolbarGroup>
        <DropdownMenu
          menuLabel="Дополнительные действия"
          align="end"
          items={overflowItems}
          trigger={({ open, toggle }) => (
            <Button
              variant="secondary"
              size="sm"
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label="Дополнительные действия"
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          )}
        />
      </ToolbarGroup>
    </div>
  );
}
