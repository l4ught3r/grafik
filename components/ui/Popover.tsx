"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { getMotionTransition } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

interface PopoverProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}

interface PopoverPosition {
  top: number;
  left: number;
  maxHeight: number;
  openAbove: boolean;
}

const VIEWPORT_PADDING = 8;
const PANEL_GAP = 6;
const FALLBACK_PANEL_HEIGHT = 320;
const FALLBACK_PANEL_WIDTH = 256;

function getTriggerElement(
  container: HTMLDivElement | null,
): HTMLElement | null {
  const child = container?.firstElementChild;
  return child instanceof HTMLElement ? child : null;
}

function computePosition(
  triggerEl: HTMLElement,
  panelEl: HTMLElement | null,
  align: "start" | "end",
): PopoverPosition {
  const rect = triggerEl.getBoundingClientRect();
  const panelHeight = panelEl?.offsetHeight ?? FALLBACK_PANEL_HEIGHT;
  const panelWidth = panelEl?.offsetWidth ?? FALLBACK_PANEL_WIDTH;

  const availableBelow =
    window.innerHeight - rect.bottom - PANEL_GAP - VIEWPORT_PADDING;
  const availableAbove = rect.top - PANEL_GAP - VIEWPORT_PADDING;
  const openAbove =
    availableBelow < panelHeight && availableAbove > availableBelow;

  let left = align === "end" ? rect.right - panelWidth : rect.left;
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, window.innerWidth - panelWidth - VIEWPORT_PADDING),
  );

  const maxHeight = Math.max(120, openAbove ? availableAbove : availableBelow);

  const top = openAbove
    ? Math.max(
        VIEWPORT_PADDING,
        rect.top - PANEL_GAP - Math.min(panelHeight, maxHeight),
      )
    : rect.bottom + PANEL_GAP;

  return { top, left, maxHeight, openAbove };
}

export function Popover({
  trigger,
  children,
  align = "start",
  className,
}: PopoverProps) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const triggerContainerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const toggle = () => setOpen((current) => !current);

  const updatePosition = useCallback(() => {
    const triggerEl = getTriggerElement(triggerContainerRef.current);
    if (!triggerEl) return;
    setPosition(computePosition(triggerEl, panelRef.current, align));
  }, [align]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handleUpdate = () => updatePosition();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerContainerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const panel =
    typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="popover-panel"
                ref={panelRef}
                id={panelId}
                role="dialog"
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : {
                        opacity: 0,
                        scale: 0.98,
                        y: position?.openAbove ? 4 : -4,
                      }
                }
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : {
                        opacity: 0,
                        scale: 0.98,
                        y: position?.openAbove ? 4 : -4,
                      }
                }
                transition={getMotionTransition("fast")}
                style={{
                  position: "fixed",
                  top: position?.top ?? 0,
                  left: position?.left ?? 0,
                  maxHeight: position?.maxHeight,
                }}
                className={cn(
                  "z-60 min-w-64 overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-lg",
                  className,
                )}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={triggerContainerRef} className="relative shrink-0">
        {trigger({ open, toggle })}
      </div>
      {panel}
    </>
  );
}
