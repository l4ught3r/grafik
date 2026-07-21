import type { ShiftDragData } from "@/components/schedule/ScheduleCell";

export function readShiftDragData(
  cell: HTMLTableCellElement,
): ShiftDragData | null {
  const employeeId = cell.dataset.employeeId;
  const day = cell.dataset.day;
  if (!employeeId || !day) return null;
  return { employeeId, day: Number(day) };
}

export function isVacationCell(cell: HTMLTableCellElement): boolean {
  return cell.dataset.vacation === "true";
}

export function isSickCell(cell: HTMLTableCellElement): boolean {
  return cell.dataset.sick === "true";
}

export function isBlockedCell(cell: HTMLTableCellElement): boolean {
  return isVacationCell(cell) || isSickCell(cell);
}
