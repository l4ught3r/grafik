import { describe, expect, test } from "bun:test";
import {
  isBlockedCell,
  isSickCell,
  isVacationCell,
  readShiftDragData,
} from "@/lib/schedule-table-interaction";

describe("schedule-table-interaction", () => {
  test("readShiftDragData читает data-атрибуты ячейки", () => {
    const cell = document.createElement("td");
    cell.dataset.employeeId = "e1";
    cell.dataset.day = "5";

    expect(readShiftDragData(cell)).toEqual({ employeeId: "e1", day: 5 });
  });

  test("isVacationCell определяет отпуск", () => {
    const vacationCell = document.createElement("td");
    vacationCell.dataset.vacation = "true";
    const workCell = document.createElement("td");
    workCell.dataset.vacation = "false";

    expect(isVacationCell(vacationCell)).toBe(true);
    expect(isVacationCell(workCell)).toBe(false);
  });

  test("isSickCell и isBlockedCell определяют больничный", () => {
    const sickCell = document.createElement("td");
    sickCell.dataset.sick = "true";
    const workCell = document.createElement("td");
    workCell.dataset.sick = "false";

    expect(isSickCell(sickCell)).toBe(true);
    expect(isSickCell(workCell)).toBe(false);
    expect(isBlockedCell(sickCell)).toBe(true);
  });
});
