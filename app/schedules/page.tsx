"use client";

import {
  Calendar,
  CalendarDays,
  Download,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/providers/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { downloadBackup, importAllData } from "@/lib/export/backup";
import { useEmployeeLists } from "@/lib/hooks/use-employee-lists";
import { useSchedules } from "@/lib/hooks/use-schedules";
import { MONTH_NAMES, type Schedule } from "@/lib/types";

export default function SchedulesPage() {
  const { schedules, remove, refresh: refreshSchedules } = useSchedules();
  const { refresh: refreshLists } = useEmployeeLists();
  const { success, error: showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const years = useMemo(
    () => [...new Set(schedules.map((s) => s.year))].sort((a, b) => b - a),
    [schedules],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return schedules.filter((schedule) => {
      if (query && !schedule.departmentName.toLowerCase().includes(query)) {
        return false;
      }
      if (yearFilter && schedule.year !== Number(yearFilter)) return false;
      if (monthFilter && schedule.month !== Number(monthFilter)) return false;
      return true;
    });
  }, [schedules, search, yearFilter, monthFilter]);

  const handleImportFile = (file: File | null) => {
    if (!file) return;
    setPendingImportFile(file);
    setImportOpen(true);
  };

  const confirmImport = async () => {
    if (!pendingImportFile) return;

    const text = await pendingImportFile.text();
    const result = importAllData(text);
    if (!result.ok) {
      showError(result.error);
      return;
    }

    refreshSchedules();
    refreshLists();
    success("Данные импортированы");
    setPendingImportFile(null);
    setImportOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-4">
      <PageHeader
        title="Мои графики"
        description="Все сохранённые графики смен"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              icon={<Download className="size-4" aria-hidden />}
              onClick={() => downloadBackup()}
            >
              Экспорт данных
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={<Upload className="size-4" aria-hidden />}
              onClick={() => fileInputRef.current?.click()}
            >
              Импорт данных
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) =>
                handleImportFile(event.target.files?.[0] ?? null)
              }
            />
            <Link href="/schedules/new">
              <Button icon={<Plus className="size-4" aria-hidden />}>
                Создать график
              </Button>
            </Link>
          </div>
        }
      />

      {schedules.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              placeholder="Поиск по отделению"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="sm:w-32"
            aria-label="Фильтр по году"
          >
            <option value="">Все годы</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
          <Select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="sm:w-36"
            aria-label="Фильтр по месяцу"
          >
            <option value="">Все месяцы</option>
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {schedules.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Графиков пока нет"
          description="Создайте первый график смен для вашего отделения."
          action={
            <Link href="/schedules/new">
              <Button>Создать первый график</Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Ничего не найдено"
          description="Попробуйте изменить параметры поиска или фильтры."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((schedule) => (
            <div key={schedule.id} className="relative">
              <Link href={`/schedules/${schedule.id}`}>
                <Card hover className="h-full p-4 pr-12">
                  <div>
                    <h2 className="truncate font-medium text-foreground">
                      {schedule.departmentName}
                    </h2>
                    <Badge variant="primary" className="mt-2">
                      {MONTH_NAMES[schedule.month - 1]} {schedule.year}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" aria-hidden />
                      {schedule.employees.length} сотр.
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3.5" aria-hidden />
                      {new Date(schedule.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                </Card>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="size-4" aria-hidden />}
                className="absolute top-3 right-3 print:hidden"
                onClick={(e) => {
                  e.preventDefault();
                  setDeleteTarget(schedule);
                }}
                aria-label={`Удалить график ${schedule.departmentName}`}
              />
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setPendingImportFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }}
        title="Импортировать данные?"
        description="Текущие графики и списки сотрудников будут полностью заменены содержимым файла."
        confirmLabel="Импортировать"
        variant="danger"
        onConfirm={confirmImport}
      />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Удалить график?"
        description={
          deleteTarget
            ? `График «${deleteTarget.departmentName}» будет удалён без возможности восстановления.`
            : undefined
        }
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) remove(deleteTarget.id);
        }}
      />
    </main>
  );
}
