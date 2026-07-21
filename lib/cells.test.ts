import { describe, expect, test } from "bun:test";
import { moveCell, setCellHours } from "@/lib/cells";
import type { Schedule } from "@/lib/types";

const baseCells: Schedule["cells"] = {
  emp1: { 1: 12, 2: 12 },
  emp2: { 3: 8 },
};

describe("setCellHours", () => {
  test("устанавливает часы без мутации исходного объекта", () => {
    const next = setCellHours(baseCells, "emp1", 5, 10);

    expect(next.emp1?.[5]).toBe(10);
    expect(baseCells.emp1?.[5]).toBeUndefined();
    expect(baseCells.emp1?.[1]).toBe(12);
  });

  test("очищает ячейку и удаляет пустой объект сотрудника", () => {
    const next = setCellHours(baseCells, "emp2", 3, null);

    expect(next.emp2).toBeUndefined();
    expect(baseCells.emp2?.[3]).toBe(8);
  });

  test("не меняет cells при очистке отсутствующей ячейки", () => {
    const next = setCellHours(baseCells, "emp1", 99, null);
    expect(next).toBe(baseCells);
  });
});

describe("moveCell", () => {
  test("переносит смену в пустую ячейку", () => {
    const next = moveCell(
      baseCells,
      { employeeId: "emp1", day: 1 },
      { employeeId: "emp2", day: 4 },
    );

    expect(next).not.toBeNull();
    expect(next?.emp1?.[1]).toBeUndefined();
    expect(next?.emp2?.[4]).toBe(12);
    expect(baseCells.emp1?.[1]).toBe(12);
  });

  test("меняет смены местами", () => {
    const cells: Schedule["cells"] = {
      emp1: { 1: 12 },
      emp2: { 2: 8 },
    };

    const next = moveCell(
      cells,
      { employeeId: "emp1", day: 1 },
      { employeeId: "emp2", day: 2 },
    );

    expect(next?.emp1?.[1]).toBe(8);
    expect(next?.emp2?.[2]).toBe(12);
  });

  test("возвращает null если источник пуст", () => {
    expect(
      moveCell(
        baseCells,
        { employeeId: "emp1", day: 99 },
        { employeeId: "emp2", day: 4 },
      ),
    ).toBeNull();
  });
});
