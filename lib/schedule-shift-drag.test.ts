import { describe, expect, test } from "bun:test";
import {
  cleanupShiftDragSession,
  createShiftDragSession,
  findScheduleCellFromPoint,
  readShiftDragPayload,
  shouldActivateDrag,
  tickAutoScroll,
  updateDropHighlight,
} from "@/lib/schedule-shift-drag";
import type { Schedule } from "@/lib/types";

const schedule: Schedule = {
  id: "s1",
  departmentName: "ОАР-2",
  month: 4,
  year: 2025,
  employees: [
    {
      id: "e1",
      name: "Иванов",
      shiftType: "day",
      vacations: [{ id: "v1", from: "2025-04-10", to: "2025-04-12" }],
    },
    {
      id: "e2",
      name: "Петров",
      shiftType: "day",
      vacations: [],
    },
  ],
  coverage: { dayMin: 1, nightMin: 0 },
  cells: {
    e1: { 5: 7.8, 6: 12 },
    e2: { 7: 7.8 },
  },
  sickDays: { e2: { 8: true } },
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

function createCell(
  doc: Document,
  attrs: Record<string, string>,
): HTMLTableCellElement {
  const td = doc.createElement("td");
  td.setAttribute("data-schedule-cell", "true");
  for (const [key, value] of Object.entries(attrs)) {
    td.dataset[key] = value;
  }
  doc.body.appendChild(td);
  return td;
}

describe("schedule-shift-drag", () => {
  test("shouldActivateDrag срабатывает после порога 5px", () => {
    expect(shouldActivateDrag(4, 0)).toBe(false);
    expect(shouldActivateDrag(3, 3)).toBe(false);
    expect(shouldActivateDrag(5, 0)).toBe(true);
    expect(shouldActivateDrag(3, 4.5)).toBe(true);
  });

  test("readShiftDragPayload читает data-атрибуты", () => {
    const td = document.createElement("td");
    td.dataset.employeeId = "e1";
    td.dataset.day = "10";
    td.dataset.hours = "7.8";

    expect(readShiftDragPayload(td)).toEqual({
      employeeId: "e1",
      day: 10,
      hours: 7.8,
    });
    expect(readShiftDragPayload(document.createElement("td"))).toBeNull();
  });

  test("findScheduleCellFromPoint находит ячейку под курсором", () => {
    const doc = document;
    const td = createCell(doc, {
      employeeId: "e1",
      day: "5",
      hours: "7.8",
    });
    const button = doc.createElement("button");
    button.textContent = "7,8";
    td.appendChild(button);

    td.getBoundingClientRect = () =>
      ({
        left: 10,
        top: 20,
        right: 50,
        bottom: 48,
        width: 40,
        height: 28,
        x: 10,
        y: 20,
        toJSON: () => ({}),
      }) as DOMRect;

    doc.elementFromPoint = () => button;

    expect(findScheduleCellFromPoint(doc, 25, 30)).toBe(td);
  });

  test("updateDropHighlight вешает valid/invalid классы", () => {
    const session = createShiftDragSession();
    session.payload = { employeeId: "e1", day: 5, hours: 7.8 };

    const source = createCell(document, {
      employeeId: "e1",
      day: "5",
      hours: "7.8",
    });
    const validTarget = createCell(document, {
      employeeId: "e1",
      day: "6",
      vacation: "false",
      sick: "false",
    });
    const invalidTarget = createCell(document, {
      employeeId: "e1",
      day: "10",
      vacation: "true",
      sick: "false",
    });

    session.sourceTd = source;

    updateDropHighlight(session, validTarget, schedule);
    expect(validTarget.classList.contains("schedule-drop-target")).toBe(true);
    expect(validTarget.title).toBe("Обмен сменами");

    updateDropHighlight(session, invalidTarget, schedule);
    expect(validTarget.classList.contains("schedule-drop-target")).toBe(false);
    expect(invalidTarget.classList.contains("schedule-drop-invalid")).toBe(
      true,
    );

    cleanupShiftDragSession(session);
    expect(invalidTarget.classList.contains("schedule-drop-invalid")).toBe(
      false,
    );
  });

  test("tickAutoScroll сдвигает scrollLeft у края", () => {
    const container = document.createElement("div");
    container.scrollLeft = 100;
    container.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 200,
        top: 0,
        bottom: 100,
        width: 200,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    expect(tickAutoScroll(container, 10)).toBe(true);
    expect(container.scrollLeft).toBe(88);

    expect(tickAutoScroll(container, 190)).toBe(true);
    expect(container.scrollLeft).toBe(100);
  });
});
