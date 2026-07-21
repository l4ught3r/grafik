import { VacationCalendarPicker } from "@/components/forms/VacationCalendarPicker";
import type { VacationPeriod } from "@/lib/types";

interface VacationFieldsProps {
  vacations: VacationPeriod[];
  onChange: (vacations: VacationPeriod[]) => void;
  layout?: "inline" | "panel";
  scheduleYear?: number;
  scheduleMonth?: number;
}

export function VacationFields({
  vacations,
  onChange,
  scheduleYear,
  scheduleMonth,
}: VacationFieldsProps) {
  return (
    <VacationCalendarPicker
      vacations={vacations}
      onChange={onChange}
      initialYear={scheduleYear}
      initialMonth={scheduleMonth}
    />
  );
}
