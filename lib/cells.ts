import type { Schedule } from "@/lib/types";

export interface CellRef {
  employeeId: string;
  day: number;
}

function cloneEmployeeDays(
  cells: Schedule["cells"],
  employeeId: string,
): Record<number, number | null> {
  return { ...(cells[employeeId] ?? {}) };
}

export function setCellHours(
  cells: Schedule["cells"],
  employeeId: string,
  day: number,
  hours: number | null,
): Schedule["cells"] {
  const employeeDays = cloneEmployeeDays(cells, employeeId);

  if (hours == null) {
    if (!(day in employeeDays)) return cells;
    const { [day]: _, ...rest } = employeeDays;
    if (Object.keys(rest).length === 0) {
      const { [employeeId]: __, ...restCells } = cells;
      return restCells;
    }
    return { ...cells, [employeeId]: rest };
  }

  return {
    ...cells,
    [employeeId]: { ...employeeDays, [day]: hours },
  };
}

export function moveCell(
  cells: Schedule["cells"],
  from: CellRef,
  to: CellRef,
): Schedule["cells"] | null {
  const sourceHours = cells[from.employeeId]?.[from.day];
  if (sourceHours == null) return null;
  if (from.employeeId === to.employeeId && from.day === to.day) return cells;

  const targetHours = cells[to.employeeId]?.[to.day] ?? null;

  let next = setCellHours(cells, from.employeeId, from.day, null);
  next = setCellHours(next, to.employeeId, to.day, sourceHours);

  if (targetHours != null) {
    next = setCellHours(next, from.employeeId, from.day, targetHours);
  }

  return next;
}
