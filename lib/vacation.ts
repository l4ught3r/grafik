import { formatDisplayDate } from "@/lib/dates";
import type { VacationPeriod } from "@/lib/types";

export function formatVacationsSummary(vacations: VacationPeriod[]): {
  label: string;
  configured: boolean;
} {
  const complete = vacations.filter((vacation) => vacation.from && vacation.to);

  if (complete.length === 0) {
    return { label: "Отпуск", configured: false };
  }

  if (complete.length === 1) {
    const vacation = complete[0];
    return {
      label: `${formatDisplayDate(vacation.from)} — ${formatDisplayDate(vacation.to)}`,
      configured: true,
    };
  }

  return { label: `${complete.length} периода`, configured: true };
}
