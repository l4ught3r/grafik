import {
  canDropShift,
  getDropTargetTitle,
  type ScheduleCellRef,
} from "@/lib/schedule-dnd";
import type { Schedule } from "@/lib/types";
import { formatHours } from "@/lib/utils";

export const DRAG_ACTIVATION_PX = 5;
export const AUTO_SCROLL_EDGE_PX = 40;
export const AUTO_SCROLL_SPEED = 12;

const DROP_TARGET_CLASS = "schedule-drop-target";
const DROP_INVALID_CLASS = "schedule-drop-invalid";
const DRAGGING_CLASS = "schedule-cell-dragging";

export interface ShiftDragPayload extends ScheduleCellRef {
  hours: number;
}

export interface ShiftDragSession {
  pointerId: number | null;
  dragging: boolean;
  pending: boolean;
  startX: number;
  startY: number;
  sourceTd: HTMLTableCellElement | null;
  dropTd: HTMLTableCellElement | null;
  payload: ShiftDragPayload | null;
}

export function createShiftDragSession(): ShiftDragSession {
  return {
    pointerId: null,
    dragging: false,
    pending: false,
    startX: 0,
    startY: 0,
    sourceTd: null,
    dropTd: null,
    payload: null,
  };
}

export function shouldActivateDrag(
  dx: number,
  dy: number,
  threshold = DRAG_ACTIVATION_PX,
): boolean {
  return Math.hypot(dx, dy) >= threshold;
}

export function readShiftDragPayload(
  td: HTMLTableCellElement,
): ShiftDragPayload | null {
  const employeeId = td.dataset.employeeId;
  const day = td.dataset.day;
  const hoursRaw = td.dataset.hours;
  if (!employeeId || !day || hoursRaw == null) return null;

  const hours = Number(hoursRaw);
  const dayNum = Number(day);
  if (!Number.isFinite(hours) || !Number.isInteger(dayNum) || dayNum < 1) {
    return null;
  }

  return { employeeId, day: dayNum, hours };
}

export function getDraggableCellFromTarget(
  target: EventTarget | null,
): HTMLTableCellElement | null {
  if (!(target instanceof Element)) return null;

  const button = target.closest("button");
  if (!button) return null;

  const td = button.closest("td[data-schedule-cell][data-hours]");
  return td != null && td.tagName === "TD"
    ? (td as HTMLTableCellElement)
    : null;
}

export function findScheduleCellFromPoint(
  doc: Document,
  x: number,
  y: number,
): HTMLTableCellElement | null {
  const el = doc.elementFromPoint(x, y);
  if (!(el instanceof Element)) return null;

  const cell = el.closest("td[data-schedule-cell]");
  return cell != null && cell.tagName === "TD"
    ? (cell as HTMLTableCellElement)
    : null;
}

export function clearDropHighlight(session: ShiftDragSession): void {
  if (!session.dropTd) return;

  session.dropTd.classList.remove(DROP_TARGET_CLASS, DROP_INVALID_CLASS);
  session.dropTd.removeAttribute("title");
  session.dropTd = null;
}

export function updateDropHighlight(
  session: ShiftDragSession,
  targetTd: HTMLTableCellElement | null,
  schedule: Schedule,
): void {
  if (targetTd === session.dropTd) return;

  clearDropHighlight(session);
  if (!targetTd || !session.payload) return;

  const over: ScheduleCellRef = {
    employeeId: targetTd.dataset.employeeId ?? "",
    day: Number(targetTd.dataset.day),
  };
  const active: ScheduleCellRef = {
    employeeId: session.payload.employeeId,
    day: session.payload.day,
  };

  if (!over.employeeId || !Number.isInteger(over.day)) return;

  if (canDropShift(active, over, schedule)) {
    targetTd.classList.add(DROP_TARGET_CLASS);
    const title = getDropTargetTitle(active, over, schedule);
    if (title) targetTd.title = title;
  } else if (targetTd !== session.sourceTd) {
    targetTd.classList.add(DROP_INVALID_CLASS);
  }

  session.dropTd = targetTd;
}

export function markSourceDragging(
  td: HTMLTableCellElement | null,
  dragging: boolean,
): void {
  if (!td) return;
  td.classList.toggle(DRAGGING_CLASS, dragging);
}

export function setBodyDragging(active: boolean): void {
  document.body.classList.toggle("schedule-is-dragging", active);
}

export function positionGhost(
  ghostEl: HTMLElement,
  clientX: number,
  clientY: number,
): void {
  ghostEl.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-50%, -50%)`;
}

export function setGhostVisible(ghostEl: HTMLElement, visible: boolean): void {
  ghostEl.style.visibility = visible ? "visible" : "hidden";
  ghostEl.style.opacity = visible ? "1" : "0";
}

export function setGhostLabel(ghostEl: HTMLElement, label: string): void {
  const labelEl = ghostEl.querySelector("[data-shift-drag-label]");
  if (labelEl) labelEl.textContent = label;
}

export function tickAutoScroll(
  container: HTMLElement,
  clientX: number,
  edgePx = AUTO_SCROLL_EDGE_PX,
  speed = AUTO_SCROLL_SPEED,
): boolean {
  const rect = container.getBoundingClientRect();
  let scrolled = false;

  if (clientX - rect.left < edgePx) {
    container.scrollLeft -= speed;
    scrolled = true;
  } else if (rect.right - clientX < edgePx) {
    container.scrollLeft += speed;
    scrolled = true;
  }

  return scrolled;
}

export function resolveDrop(
  session: ShiftDragSession,
  schedule: Schedule,
): { from: ShiftDragPayload; to: ScheduleCellRef } | null {
  if (!session.payload || !session.dropTd) return null;

  const over: ScheduleCellRef = {
    employeeId: session.dropTd.dataset.employeeId ?? "",
    day: Number(session.dropTd.dataset.day),
  };
  const active: ScheduleCellRef = {
    employeeId: session.payload.employeeId,
    day: session.payload.day,
  };

  if (!over.employeeId || !Number.isInteger(over.day)) return null;
  if (!canDropShift(active, over, schedule)) return null;

  return { from: session.payload, to: over };
}

export function cleanupShiftDragSession(session: ShiftDragSession): void {
  markSourceDragging(session.sourceTd, false);
  clearDropHighlight(session);
  setBodyDragging(false);
  session.pointerId = null;
  session.dragging = false;
  session.pending = false;
  session.sourceTd = null;
  session.payload = null;
}

export function formatShiftDragLabel(hours: number): string {
  return formatHours(hours);
}
