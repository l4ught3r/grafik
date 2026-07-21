import { beforeEach, describe, expect, test } from "bun:test";
import {
  BACKUP_VERSION,
  exportAllData,
  importAllData,
} from "@/lib/export/backup";
import {
  EMPLOYEE_LISTS_STORAGE_KEY,
  getEmployeeLists,
  getSchedules,
  SCHEDULES_STORAGE_KEY,
} from "@/lib/storage";
import type { Schedule } from "@/lib/types";

const schedule: Schedule = {
  id: "backup-schedule",
  departmentName: "Backup",
  month: 3,
  year: 2025,
  employees: [],
  coverage: { dayMin: 0, nightMin: 0 },
  cells: {},
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("backup", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("export/import round-trip", async () => {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify([schedule]));
    localStorage.setItem(EMPLOYEE_LISTS_STORAGE_KEY, JSON.stringify([]));

    const blob = exportAllData();
    const text = await blob.text();
    const result = importAllData(text);

    expect(result.ok).toBe(true);
    expect(getSchedules()).toHaveLength(1);
    expect(getSchedules()[0]?.id).toBe("backup-schedule");
    expect(getEmployeeLists()).toEqual([]);
  });

  test("отклоняет некорректный JSON", () => {
    const result = importAllData("{bad");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Некорректный JSON");
    }
  });

  test("экспорт содержит версию", async () => {
    const blob = exportAllData();
    const payload = JSON.parse(await blob.text());
    expect(payload.version).toBe(BACKUP_VERSION);
    expect(payload.exportedAt).toBeString();
  });
});
