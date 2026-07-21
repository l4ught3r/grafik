import { EmployeeCard } from "@/components/forms/EmployeeCard";
import type { DraftScheduleEmployee } from "@/lib/types";

interface EmployeeRowProps {
  index: number;
  employee: DraftScheduleEmployee;
  scheduleYear?: number;
  scheduleMonth?: number;
  onChange: (employee: DraftScheduleEmployee) => void;
  onRemove: () => void;
}

export function EmployeeRow({
  index,
  employee,
  scheduleYear,
  scheduleMonth,
  onChange,
  onRemove,
}: EmployeeRowProps) {
  return (
    <EmployeeCard
      index={index}
      name={employee.name}
      shiftType={employee.shiftType}
      dutyPreferences={employee.dutyPreferences}
      monthPlan={employee.monthPlan}
      vacations={employee.vacations}
      showVacations
      scheduleYear={scheduleYear}
      scheduleMonth={scheduleMonth}
      onNameChange={(name) => onChange({ ...employee, name })}
      onShiftTypeChange={(shiftType) =>
        onChange({
          ...employee,
          shiftType,
          dutyPreferences:
            shiftType === "day" ? (employee.dutyPreferences ?? []) : [],
          monthPlan:
            shiftType === "day" || shiftType === "night"
              ? employee.monthPlan
              : undefined,
        })
      }
      onDutyPreferencesChange={(dutyPreferences) =>
        onChange({ ...employee, dutyPreferences })
      }
      onMonthPlanChange={(monthPlan) => onChange({ ...employee, monthPlan })}
      onVacationsChange={(vacations) => onChange({ ...employee, vacations })}
      onRemove={onRemove}
    />
  );
}
