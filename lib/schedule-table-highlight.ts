export interface ScheduleHoverState {
  row: HTMLTableRowElement | null;
  col: string | null;
}

export function createScheduleHoverState(): ScheduleHoverState {
  return { row: null, col: null };
}

function isEmployeeRow(row: Element | null): row is HTMLTableRowElement {
  return (
    row != null && row.tagName === "TR" && row.hasAttribute("data-employee-id")
  );
}

export function updateScheduleHoverHighlight(
  table: HTMLTableElement,
  cell: Element,
  state: ScheduleHoverState,
): boolean {
  const day = cell.getAttribute("data-day");
  const row = cell.closest("tbody tr[data-employee-id]");

  if (!isEmployeeRow(row)) {
    return clearScheduleHoverHighlight(table, state);
  }

  const dayValue = day ?? null;
  if (dayValue === state.col && row === state.row) {
    return false;
  }

  if (dayValue !== state.col) {
    if (dayValue) {
      table.setAttribute("data-h-col", dayValue);
    } else {
      table.removeAttribute("data-h-col");
    }
    state.col = dayValue;
  }

  if (row !== state.row) {
    state.row?.classList.remove("schedule-row-hover");
    row.classList.add("schedule-row-hover");
    state.row = row;
  }

  return true;
}

export function clearScheduleHoverHighlight(
  table: HTMLTableElement,
  state: ScheduleHoverState,
): boolean {
  let changed = false;

  if (state.col != null) {
    table.removeAttribute("data-h-col");
    state.col = null;
    changed = true;
  }

  if (state.row) {
    state.row.classList.remove("schedule-row-hover");
    state.row = null;
    changed = true;
  }

  return changed;
}

export function findScheduleHoverCell(
  target: EventTarget | null,
): Element | null {
  if (!(target instanceof Element)) return null;
  return target.closest("td[data-schedule-cell], th[data-day]");
}
