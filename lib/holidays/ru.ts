// Производственный календарь РФ: нерабочие праздничные дни (включая переносы)
// Источник: официальные постановления правительства РФ
// Обновляйте HOLIDAYS ежегодно по постановлению о переносах выходных.

const HOLIDAYS: Record<number, string[]> = {
  2025: [
    "2025-01-01",
    "2025-01-02",
    "2025-01-03",
    "2025-01-04",
    "2025-01-05",
    "2025-01-06",
    "2025-01-07",
    "2025-01-08",
    "2025-02-23",
    "2025-03-08",
    "2025-05-01",
    "2025-05-02",
    "2025-05-08",
    "2025-05-09",
    "2025-06-12",
    "2025-06-13",
    "2025-11-03",
    "2025-11-04",
    "2025-12-31",
  ],
  2026: [
    "2026-01-01",
    "2026-01-02",
    "2026-01-03",
    "2026-01-04",
    "2026-01-05",
    "2026-01-06",
    "2026-01-07",
    "2026-01-08",
    "2026-01-09",
    "2026-02-23",
    "2026-03-08",
    "2026-03-09",
    "2026-05-01",
    "2026-05-09",
    "2026-05-11",
    "2026-06-12",
    "2026-11-04",
    "2026-12-31",
  ],
  2027: [
    "2027-01-01",
    "2027-01-02",
    "2027-01-03",
    "2027-01-04",
    "2027-01-05",
    "2027-01-06",
    "2027-01-07",
    "2027-01-08",
    "2027-02-23",
    "2027-03-08",
    "2027-05-01",
    "2027-05-03",
    "2027-05-09",
    "2027-05-10",
    "2027-06-12",
    "2027-06-14",
    "2027-11-04",
    "2027-12-31",
  ],
  // 2028: базовые праздники без финальных переносов (уточнить по постановлению Правительства)
  2028: [
    "2028-01-01",
    "2028-01-02",
    "2028-01-03",
    "2028-01-04",
    "2028-01-05",
    "2028-01-06",
    "2028-01-07",
    "2028-01-08",
    "2028-02-23",
    "2028-03-08",
    "2028-05-01",
    "2028-05-09",
    "2028-06-12",
    "2028-11-04",
    "2028-12-31",
  ],
};

export const SUPPORTED_HOLIDAY_YEARS = Object.keys(HOLIDAYS)
  .map(Number)
  .sort((a, b) => a - b);

const holidaySetCache = new Map<number, Set<string>>();
const preHolidaySetCache = new Map<number, Set<string>>();

function getHolidaySet(year: number): Set<string> {
  const cached = holidaySetCache.get(year);
  if (cached) return cached;

  const set = new Set(HOLIDAYS[year] ?? []);
  holidaySetCache.set(year, set);
  return set;
}

function addDaysToDateString(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(y, m - 1, d + delta);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isWeekdayDate(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6;
}

function buildPreHolidaySet(year: number): Set<string> {
  const holidays = getHolidaysForYear(year);
  const preHolidays = new Set<string>();

  for (const holiday of holidays) {
    const previous = addDaysToDateString(holiday, -1);
    const previousYear = Number(previous.slice(0, 4));
    if (previousYear !== year) continue;
    if (!isWeekdayDate(previous)) continue;
    if (isRussianHoliday(previous, year)) continue;
    preHolidays.add(previous);
  }

  return preHolidays;
}

function getPreHolidaySet(year: number): Set<string> {
  const cached = preHolidaySetCache.get(year);
  if (cached) return cached;

  const set = buildPreHolidaySet(year);
  preHolidaySetCache.set(year, set);
  return set;
}

export function isRussianHoliday(date: string, year: number): boolean {
  return getHolidaySet(year).has(date);
}

export function isRussianPreHoliday(date: string, year: number): boolean {
  return getPreHolidaySet(year).has(date);
}

export function getHolidaysForYear(year: number): string[] {
  return HOLIDAYS[year] ?? [];
}

export function getPreHolidayDates(year: number): string[] {
  return [...getPreHolidaySet(year)].sort();
}

export function isHolidayYearSupported(year: number): boolean {
  return year in HOLIDAYS;
}
