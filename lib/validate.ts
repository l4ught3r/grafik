import { z } from "zod";
import { SHIFT_HOURS } from "@/lib/hours";
import type {
  DutyPreference,
  EmployeeList,
  EmployeeListMember,
  MonthPlan,
  Schedule,
  ScheduleCoverage,
  ScheduleEmployee,
  ShiftType,
  VacationPeriod,
} from "@/lib/types";

const MONTH_PLAN_HOURS = new Set<number>([
  SHIFT_HOURS.dayWeekday,
  SHIFT_HOURS.dayPreHoliday,
  SHIFT_HOURS.nightWeekday,
  SHIFT_HOURS.nightPreHoliday,
  SHIFT_HOURS.nightWeekend,
  SHIFT_HOURS.shift24,
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const finiteNumber = z.number().refine((n) => Number.isFinite(n));

const intInRange = (min: number, max: number) =>
  z.number().int().min(min).max(max);

/** Ключ-день в записях: строка из цифр, число 1..31. */
const dayKeySchema = z
  .string()
  .regex(/^\d+$/)
  .refine((key) => {
    const day = Number(key);
    return Number.isInteger(day) && day >= 1 && day <= 31;
  });

const shiftTypeSchema = z.enum(["day", "night", "aux"]);

const dutyPreferenceSchema = z.object({
  weekday: z.union([z.null(), intInRange(1, 7)]),
  timesPerWeek: intInRange(0, 7),
});

const vacationPeriodSchema = z.object({
  id: z.string(),
  from: z.string().regex(ISO_DATE),
  to: z.string().regex(ISO_DATE),
});

const monthPlanSchema = z.record(
  dayKeySchema,
  z.union([
    z.null(),
    finiteNumber.refine((hours) => MONTH_PLAN_HOURS.has(hours)),
  ]),
);

const cellsSchema = z.record(
  z.string(),
  z.record(dayKeySchema, z.union([z.null(), finiteNumber])),
);

const sickDaysSchema = z.record(
  z.string(),
  z.record(dayKeySchema, z.literal(true)),
);

const scheduleCoverageSchema = z.object({
  dayMin: intInRange(0, 100),
  nightMin: intInRange(0, 100),
});

const employeeListMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  shiftType: shiftTypeSchema.optional(),
  dutyPreferences: z.array(dutyPreferenceSchema).optional(),
});

const employeeListSchema = z.object({
  id: z.string(),
  name: z.string(),
  members: z.array(employeeListMemberSchema),
});

const scheduleEmployeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  shiftType: shiftTypeSchema,
  vacations: z.array(vacationPeriodSchema),
  dutyPreferences: z.array(dutyPreferenceSchema).optional(),
  monthPlan: monthPlanSchema.optional(),
});

const scheduleSchema = z.object({
  id: z.string(),
  departmentName: z.string(),
  month: intInRange(1, 12),
  year: intInRange(2000, 2100),
  employees: z.array(scheduleEmployeeSchema),
  coverage: scheduleCoverageSchema,
  cells: cellsSchema,
  sickDays: sickDaysSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Legacy-график отличается только «лишним» полем signatures, которое схема
// игнорирует, поэтому используем ту же схему графика.
const legacyEmployeeListSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    members: z.array(employeeListMemberSchema).optional(),
    employeeNames: z.array(z.string()).optional(),
  })
  .refine(
    (value) => value.members !== undefined || value.employeeNames !== undefined,
  );

export function isShiftType(value: unknown): value is ShiftType {
  return shiftTypeSchema.safeParse(value).success;
}

export function isEmployeeListMember(
  value: unknown,
): value is EmployeeListMember {
  return employeeListMemberSchema.safeParse(value).success;
}

export function isEmployeeList(value: unknown): value is EmployeeList {
  return employeeListSchema.safeParse(value).success;
}

export function isSchedule(value: unknown): value is Schedule {
  return scheduleSchema.safeParse(value).success;
}

export function isScheduleArray(value: unknown): value is Schedule[] {
  return z.array(scheduleSchema).safeParse(value).success;
}

export function isEmployeeListArray(value: unknown): value is EmployeeList[] {
  return z.array(employeeListSchema).safeParse(value).success;
}

interface LegacyEmployeeList {
  id: string;
  name: string;
  employeeNames?: string[];
  members?: EmployeeListMember[];
}

export function isLegacyEmployeeListArray(
  value: unknown,
): value is LegacyEmployeeList[] {
  return z.array(legacyEmployeeListSchema).safeParse(value).success;
}

export function isScheduleArrayWithLegacy(
  value: unknown,
): value is Array<Schedule & { signatures?: unknown }> {
  return z.array(scheduleSchema).safeParse(value).success;
}

export function isLegacySchedule(
  value: unknown,
): value is Schedule & { signatures?: unknown } {
  return scheduleSchema.safeParse(value).success;
}

// Compile-time защита от расхождений: вывод схем должен быть присваиваемым
// доменным типам из lib/types.ts. Ошибка сборки, если схема разойдётся с типом.
type Assert<T extends true> = T;
type _SchemaChecks = [
  Assert<z.infer<typeof shiftTypeSchema> extends ShiftType ? true : false>,
  Assert<
    z.infer<typeof dutyPreferenceSchema> extends DutyPreference ? true : false
  >,
  Assert<
    z.infer<typeof vacationPeriodSchema> extends VacationPeriod ? true : false
  >,
  Assert<z.infer<typeof monthPlanSchema> extends MonthPlan ? true : false>,
  Assert<
    z.infer<typeof scheduleCoverageSchema> extends ScheduleCoverage
      ? true
      : false
  >,
  Assert<
    z.infer<typeof employeeListMemberSchema> extends EmployeeListMember
      ? true
      : false
  >,
  Assert<
    z.infer<typeof employeeListSchema> extends EmployeeList ? true : false
  >,
  Assert<
    z.infer<typeof scheduleEmployeeSchema> extends ScheduleEmployee
      ? true
      : false
  >,
  Assert<z.infer<typeof scheduleSchema> extends Schedule ? true : false>,
];
