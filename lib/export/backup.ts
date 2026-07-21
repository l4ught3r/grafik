import {
  EMPLOYEE_LISTS_STORAGE_KEY,
  getEmployeeLists,
  getSchedules,
  SCHEDULES_STORAGE_KEY,
  type StorageWriteResult,
} from "@/lib/storage";
import { isEmployeeList, isSchedule } from "@/lib/validate";

export const BACKUP_VERSION = 1;

export interface AppBackupPayload {
  version: number;
  exportedAt: string;
  schedules: ReturnType<typeof getSchedules>;
  employeeLists: ReturnType<typeof getEmployeeLists>;
}

export function exportAllData(): Blob {
  const payload: AppBackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    schedules: getSchedules(),
    employeeLists: getEmployeeLists(),
  };

  return new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
}

export function downloadBackup(fileName = "grafik-backup.json"): void {
  if (typeof window === "undefined") return;

  const blob = exportAllData();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function writeJsonSafe(key: string, data: unknown): StorageWriteResult {
  if (typeof window === "undefined") return { ok: true };

  try {
    localStorage.setItem(key, JSON.stringify(data));
    return { ok: true };
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.code === 22)
    ) {
      return {
        ok: false,
        error: "Недостаточно места в localStorage для импорта данных.",
      };
    }

    return {
      ok: false,
      error: err instanceof Error ? err.message : "Ошибка импорта данных",
    };
  }
}

export function importAllData(
  json: string,
): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") {
    return { ok: false, error: "Импорт доступен только в браузере" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "Некорректный JSON" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Некорректный формат резервной копии" };
  }

  const record = parsed as Record<string, unknown>;
  const schedules = record.schedules;
  const employeeLists = record.employeeLists;

  if (!Array.isArray(schedules) || !Array.isArray(employeeLists)) {
    return {
      ok: false,
      error: "В резервной копии нет schedules или employeeLists",
    };
  }

  if (!schedules.every(isSchedule)) {
    return {
      ok: false,
      error: "Некорректные данные графиков в резервной копии",
    };
  }

  if (!employeeLists.every(isEmployeeList)) {
    return {
      ok: false,
      error: "Некорректные данные списков сотрудников в резервной копии",
    };
  }

  const schedulesResult = writeJsonSafe(SCHEDULES_STORAGE_KEY, schedules);
  if (!schedulesResult.ok) {
    return schedulesResult;
  }

  const listsResult = writeJsonSafe(EMPLOYEE_LISTS_STORAGE_KEY, employeeLists);
  if (!listsResult.ok) {
    return listsResult;
  }

  return { ok: true };
}
