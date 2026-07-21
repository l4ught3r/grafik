import { describe, expect, test } from "bun:test";
import {
  clearScheduleHoverHighlight,
  createScheduleHoverState,
  updateScheduleHoverHighlight,
} from "@/lib/schedule-table-highlight";

function buildHoverTable(): {
  table: HTMLTableElement;
  row: HTMLTableRowElement;
  cell: HTMLTableCellElement;
} {
  const table = document.createElement("table");
  table.className = "schedule-interactive-table";
  table.innerHTML = `
    <tbody>
      <tr data-employee-id="e1">
        <td data-schedule-cell data-employee-id="e1" data-day="5">7,8</td>
        <td data-schedule-cell data-employee-id="e1" data-day="6"></td>
      </tr>
    </tbody>
  `;

  const row = table.querySelector("tr[data-employee-id='e1']");
  const cell = table.querySelector("td[data-day='5']");
  if (!row || row.tagName !== "TR") {
    throw new Error("expected employee row");
  }
  if (!cell || cell.tagName !== "TD") {
    throw new Error("expected schedule cell");
  }

  return {
    table,
    row: row as HTMLTableRowElement,
    cell,
  };
}

describe("schedule-table-highlight", () => {
  test("updateScheduleHoverHighlight ставит колонку и строку", () => {
    const { table, row, cell } = buildHoverTable();
    const state = createScheduleHoverState();

    expect(updateScheduleHoverHighlight(table, cell, state)).toBe(true);
    expect(table.getAttribute("data-h-col")).toBe("5");
    expect(row.classList.contains("schedule-row-hover")).toBe(true);
    expect(state.col).toBe("5");
    expect(state.row).toBe(row);
  });

  test("повторный hover на ту же ячейку не меняет DOM", () => {
    const { table, row, cell } = buildHoverTable();
    const state = createScheduleHoverState();

    updateScheduleHoverHighlight(table, cell, state);
    expect(updateScheduleHoverHighlight(table, cell, state)).toBe(false);
    expect(table.getAttribute("data-h-col")).toBe("5");
    expect(row.classList.contains("schedule-row-hover")).toBe(true);
  });

  test("clearScheduleHoverHighlight снимает подсветку", () => {
    const { table, row, cell } = buildHoverTable();
    const state = createScheduleHoverState();

    updateScheduleHoverHighlight(table, cell, state);
    expect(clearScheduleHoverHighlight(table, state)).toBe(true);
    expect(table.hasAttribute("data-h-col")).toBe(false);
    expect(row.classList.contains("schedule-row-hover")).toBe(false);
    expect(state.row).toBeNull();
    expect(state.col).toBeNull();
  });
});
