"use client";

import { type RefObject, useEffect, useRef } from "react";
import type { ShiftDragData } from "@/components/schedule/ScheduleCell";
import {
  cleanupShiftDragSession,
  createShiftDragSession,
  findScheduleCellFromPoint,
  formatShiftDragLabel,
  getDraggableCellFromTarget,
  markSourceDragging,
  positionGhost,
  readShiftDragPayload,
  resolveDrop,
  setBodyDragging,
  setGhostLabel,
  setGhostVisible,
  shouldActivateDrag,
  tickAutoScroll,
  updateDropHighlight,
} from "@/lib/schedule-shift-drag";
import type { Schedule } from "@/lib/types";

interface UseScheduleShiftDragOptions {
  tableRef: RefObject<HTMLTableElement | null>;
  scrollRef: RefObject<HTMLElement | null>;
  ghostRef: RefObject<HTMLElement | null>;
  schedule: Schedule;
  onCellMove: (from: ShiftDragData, to: ShiftDragData) => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

export function useScheduleShiftDrag({
  tableRef,
  scrollRef,
  ghostRef,
  schedule,
  onCellMove,
  onDragStateChange,
}: UseScheduleShiftDragOptions) {
  const sessionRef = useRef(createShiftDragSession());
  const rafRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<{ x: number; y: number } | null>(null);
  const scheduleRef = useRef(schedule);
  const onCellMoveRef = useRef(onCellMove);
  const onDragStateChangeRef = useRef(onDragStateChange);

  scheduleRef.current = schedule;
  onCellMoveRef.current = onCellMove;
  onDragStateChangeRef.current = onDragStateChange;

  useEffect(() => {
    const table = tableRef.current;
    const tbody = table?.querySelector("tbody");
    if (!tbody) return;

    const session = sessionRef.current;

    const flushMove = () => {
      rafRef.current = null;
      const point = pendingMoveRef.current;
      const ghost = ghostRef.current;
      if (!point) return;

      if (session.dragging && ghost) {
        positionGhost(ghost, point.x, point.y);
        const targetTd = findScheduleCellFromPoint(document, point.x, point.y);
        updateDropHighlight(session, targetTd, scheduleRef.current);

        const scrollEl = scrollRef.current;
        if (scrollEl) {
          tickAutoScroll(scrollEl, point.x);
        }
      }
    };

    const scheduleMove = (clientX: number, clientY: number) => {
      pendingMoveRef.current = { x: clientX, y: clientY };
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flushMove);
      }
    };

    const activateDrag = (event: PointerEvent) => {
      const ghost = ghostRef.current;
      const payload = session.payload;
      if (!ghost || !payload || !session.sourceTd) return;

      session.dragging = true;
      session.pending = false;
      markSourceDragging(session.sourceTd, true);
      setGhostLabel(ghost, formatShiftDragLabel(payload.hours));
      setGhostVisible(ghost, true);
      setBodyDragging(true);
      onDragStateChangeRef.current?.(true);

      if (tbody instanceof Element) {
        tbody.setPointerCapture(event.pointerId);
      }
    };

    const finishDrag = () => {
      const ghost = ghostRef.current;
      const result = resolveDrop(session, scheduleRef.current);

      if (result) {
        onCellMoveRef.current(result.from, result.to);
      }

      if (ghost) {
        setGhostVisible(ghost, false);
      }

      cleanupShiftDragSession(session);
      onDragStateChangeRef.current?.(false);
      pendingMoveRef.current = null;

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;

      const td = getDraggableCellFromTarget(event.target);
      if (!td) return;

      const payload = readShiftDragPayload(td);
      if (!payload) return;

      session.pointerId = event.pointerId;
      session.pending = true;
      session.dragging = false;
      session.startX = event.clientX;
      session.startY = event.clientY;
      session.sourceTd = td;
      session.payload = payload;
      session.dropTd = null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (session.pointerId !== event.pointerId) return;

      if (session.pending && !session.dragging) {
        const dx = event.clientX - session.startX;
        const dy = event.clientY - session.startY;
        if (!shouldActivateDrag(dx, dy)) return;
        activateDrag(event);
      }

      if (session.dragging || session.pending) {
        scheduleMove(event.clientX, event.clientY);
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (session.pointerId !== event.pointerId) return;

      if (session.dragging) {
        scheduleMove(event.clientX, event.clientY);
        flushMove();
        finishDrag();
      } else if (session.pending) {
        cleanupShiftDragSession(session);
      }

      try {
        if (tbody instanceof Element && session.dragging) {
          tbody.releasePointerCapture(event.pointerId);
        }
      } catch {
        // pointer capture may already be released
      }
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (session.pointerId !== event.pointerId) return;

      const ghost = ghostRef.current;
      if (ghost) {
        setGhostVisible(ghost, false);
      }
      cleanupShiftDragSession(session);
      onDragStateChangeRef.current?.(false);
    };

    tbody.addEventListener("pointerdown", handlePointerDown);
    tbody.addEventListener("pointermove", handlePointerMove);
    tbody.addEventListener("pointerup", handlePointerUp);
    tbody.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      tbody.removeEventListener("pointerdown", handlePointerDown);
      tbody.removeEventListener("pointermove", handlePointerMove);
      tbody.removeEventListener("pointerup", handlePointerUp);
      tbody.removeEventListener("pointercancel", handlePointerCancel);

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }

      const ghost = ghostRef.current;
      if (ghost) {
        setGhostVisible(ghost, false);
      }
      cleanupShiftDragSession(session);
    };
  }, [ghostRef, scrollRef, tableRef]);
}
