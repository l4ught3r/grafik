export type ShiftType = "day" | "night" | "aux";

export interface DutyPreference {
  /** null — любой рабочий день недели */
  weekday: number | null;
  timesPerWeek: number;
}

export interface EmployeeListMember {
  id: string;
  name: string;
  /** Не задан — пользователь выбирает в интерфейсе списка */
  shiftType?: ShiftType;
  dutyPreferences?: DutyPreference[];
}

export interface EmployeeList {
  id: string;
  name: string;
  members: EmployeeListMember[];
}

export interface VacationPeriod {
  id: string;
  from: string;
  to: string;
}

/**
 * Жёсткий помесячный план (только night).
 * Ключ — номер дня. Наличие ключа = locked.
 * null = locked свободный день; число = locked часы смены.
 */
export type MonthPlan = Record<number, number | null>;

export interface ScheduleEmployee {
  id: string;
  name: string;
  shiftType: ShiftType;
  vacations: VacationPeriod[];
  dutyPreferences?: DutyPreference[];
  monthPlan?: MonthPlan;
}

/** Сотрудник в форме до выбора типа смены */
export type DraftScheduleEmployee = Omit<ScheduleEmployee, "shiftType"> & {
  shiftType?: ShiftType;
};

export interface ScheduleCoverage {
  dayMin: number;
  nightMin: number;
}

/** Дни больничного: employeeId → номер дня → true */
export type ScheduleSickDays = Record<string, Record<number, true>>;

export interface Schedule {
  id: string;
  departmentName: string;
  month: number;
  year: number;
  employees: ScheduleEmployee[];
  coverage: ScheduleCoverage;
  cells: Record<string, Record<number, number | null>>;
  sickDays?: ScheduleSickDays;
  /** Список сотрудников, из которого загружен состав графика */
  sourceListId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarDay {
  day: number;
  date: string;
  isWeekend: boolean;
  isHoliday: boolean;
  isPreHoliday: boolean;
  isWorkingDay: boolean;
}

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  day: "День",
  night: "Ночь",
  aux: "Вспомогательный",
};

export const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
