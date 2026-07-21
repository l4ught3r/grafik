import { DEMO_SCHEDULE } from "@/lib/seed/demo-schedule";
import { DEFAULT_EMPLOYEE_LIST } from "@/lib/seed/default-employee-list";
import { NURSES_EMPLOYEE_LIST } from "@/lib/seed/nurses-employee-list";
import type {
  EmployeeList,
  EmployeeListMember,
  Schedule,
  ShiftType,
} from "@/lib/types";
import { generateId, sortByName } from "@/lib/utils";
import { isLegacyEmployeeListArray, isLegacySchedule } from "@/lib/validate";

interface LegacyEmployeeList {
  id: string;
  name: string;
  employeeNames?: string[];
  members?: EmployeeListMember[];
}

/** Заменяет устаревший тип смены shift24 на aux в сырых данных перед валидацией. */
function normalizeShiftTypes(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeShiftTypes);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] =
        key === "shiftType" && val === "shift24"
          ? "aux"
          : normalizeShiftTypes(val);
    }
    return result;
  }
  return value;
}

function migrateMember(member: EmployeeListMember): EmployeeListMember {
  return {
    ...member,
    dutyPreferences: member.dutyPreferences ?? [],
  };
}

function withSortedMembers(list: EmployeeList): EmployeeList {
  return { ...list, members: sortByName(list.members) };
}

function migrateEmployeeList(raw: LegacyEmployeeList): EmployeeList {
  if (raw.members) {
    return withSortedMembers({
      id: raw.id,
      name: raw.name,
      members: raw.members.map(migrateMember),
    });
  }

  return withSortedMembers({
    id: raw.id,
    name: raw.name,
    members: (raw.employeeNames ?? []).map((name) => ({
      id: generateId(),
      name,
      shiftType: "day" as ShiftType,
      dutyPreferences: [],
    })),
  });
}

function migrateSchedule(raw: Schedule & { signatures?: unknown }): Schedule {
  const { signatures: _, ...schedule } = raw;
  return schedule;
}

export const SCHEDULES_STORAGE_KEY = "grafik_schedules";
export const EMPLOYEE_LISTS_STORAGE_KEY = "grafik_employee_lists";

export type StorageWriteResult = { ok: true } | { ok: false; error: string };

const SCHEDULES_KEY = SCHEDULES_STORAGE_KEY;
const EMPLOYEE_LISTS_KEY = EMPLOYEE_LISTS_STORAGE_KEY;

function warnInvalidStorage(key: string, detail: string): void {
  if (typeof window === "undefined") return;
  console.warn(`[grafik] Invalid data in localStorage key "${key}": ${detail}`);
}

function readSchedulesRaw(): Array<Schedule & { signatures?: unknown }> {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(SCHEDULES_KEY);
    if (!raw) return [];

    const parsed: unknown = normalizeShiftTypes(JSON.parse(raw));
    if (!Array.isArray(parsed)) {
      warnInvalidStorage(SCHEDULES_KEY, "expected an array");
      return [];
    }

    return parsed.filter(
      (item): item is Schedule & { signatures?: unknown } => {
        if (isLegacySchedule(item)) return true;
        warnInvalidStorage(SCHEDULES_KEY, "skipping invalid schedule entry");
        return false;
      },
    );
  } catch {
    warnInvalidStorage(SCHEDULES_KEY, "failed to parse JSON");
    return [];
  }
}

function readEmployeeListsRaw(): LegacyEmployeeList[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(EMPLOYEE_LISTS_KEY);
    if (!raw) return [];

    const parsed: unknown = normalizeShiftTypes(JSON.parse(raw));
    if (!isLegacyEmployeeListArray(parsed)) {
      warnInvalidStorage(
        EMPLOYEE_LISTS_KEY,
        "expected an array of employee lists",
      );
      return [];
    }

    return parsed;
  } catch {
    warnInvalidStorage(EMPLOYEE_LISTS_KEY, "failed to parse JSON");
    return [];
  }
}

function writeJson<T>(key: string, data: T): StorageWriteResult {
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
        error:
          "Недостаточно места в localStorage. Удалите старые графики или экспортируйте данные.",
      };
    }

    return {
      ok: false,
      error: err instanceof Error ? err.message : "Ошибка сохранения данных",
    };
  }
}

export function getSchedules(): Schedule[] {
  return readSchedulesRaw().map(migrateSchedule);
}

export function getSchedule(id: string): Schedule | undefined {
  return getSchedules().find((s) => s.id === id);
}

/** Пишет массив графиков без повторного чтения/валидации из localStorage. */
export function writeSchedules(schedules: Schedule[]): StorageWriteResult {
  return writeJson(SCHEDULES_KEY, schedules);
}

export function saveSchedule(
  schedule: Schedule,
  existing?: Schedule[],
): StorageWriteResult {
  const schedules = existing ?? getSchedules();
  const index = schedules.findIndex((s) => s.id === schedule.id);
  const updated = { ...schedule, updatedAt: new Date().toISOString() };

  const next =
    index >= 0
      ? schedules.map((s, i) => (i === index ? updated : s))
      : [...schedules, updated];

  return writeJson(SCHEDULES_KEY, next);
}

export function deleteSchedule(
  id: string,
  existing?: Schedule[],
): StorageWriteResult {
  const schedules = existing ?? getSchedules();
  return writeJson(
    SCHEDULES_KEY,
    schedules.filter((s) => s.id !== id),
  );
}

export function getEmployeeLists(): EmployeeList[] {
  return readEmployeeListsRaw().map(migrateEmployeeList);
}

const SEED_EMPLOYEE_LISTS: EmployeeList[] = [
  DEFAULT_EMPLOYEE_LIST,
  NURSES_EMPLOYEE_LIST,
];

export function ensureDefaultEmployeeLists(): void {
  if (typeof window === "undefined") return;

  const raw = readEmployeeListsRaw();

  for (const seed of SEED_EMPLOYEE_LISTS) {
    const index = raw.findIndex((l) => l.id === seed.id);
    if (index < 0) {
      saveEmployeeList(seed);
      continue;
    }

    const existing = raw[index];
    if (existing.employeeNames && !existing.members) {
      saveEmployeeList(seed);
    }
  }
}

const SEED_SCHEDULES: Schedule[] = [DEMO_SCHEDULE];

/** Добавляет встроенные демо-графики, если их ещё нет в localStorage. */
export function ensureDefaultSchedules(): void {
  if (typeof window === "undefined") return;

  for (const seed of SEED_SCHEDULES) {
    if (getSchedule(seed.id)) continue;
    saveSchedule(seed);
  }
}

export function getEmployeeList(id: string): EmployeeList | undefined {
  return getEmployeeLists().find((l) => l.id === id);
}

export function saveEmployeeList(list: EmployeeList): {
  list: EmployeeList;
  result: StorageWriteResult;
} {
  const sorted = withSortedMembers(list);
  const lists = getEmployeeLists();
  const index = lists.findIndex((l) => l.id === sorted.id);

  const next =
    index >= 0
      ? lists.map((l, i) => (i === index ? sorted : l))
      : [...lists, sorted];

  return {
    list: sorted,
    result: writeJson(EMPLOYEE_LISTS_KEY, next),
  };
}

export function deleteEmployeeList(id: string): StorageWriteResult {
  return writeJson(
    EMPLOYEE_LISTS_KEY,
    getEmployeeLists().filter((l) => l.id !== id),
  );
}
