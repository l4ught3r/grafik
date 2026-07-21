"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { getMotionTransition } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

export interface DropdownMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
}

interface DropdownMenuProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: DropdownMenuItem[];
  align?: "start" | "end";
  className?: string;
  menuLabel?: string;
}

export function DropdownMenu({
  trigger,
  items,
  align = "start",
  className,
  menuLabel,
}: DropdownMenuProps) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const toggle = () => setOpen((current) => !current);
  const close = useCallback(() => {
    setOpen(false);
    setFocusIndex(-1);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        close();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }

      const enabledIndices = items
        .map((item, index) => (item.disabled ? -1 : index))
        .filter((index) => index >= 0);

      if (enabledIndices.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setFocusIndex((current) => {
          const pos = enabledIndices.indexOf(current);
          const next = pos < 0 ? 0 : (pos + 1) % enabledIndices.length;
          return enabledIndices[next] ?? -1;
        });
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setFocusIndex((current) => {
          const pos = enabledIndices.indexOf(current);
          const next =
            pos < 0
              ? enabledIndices[enabledIndices.length - 1]
              : enabledIndices[
                  (pos - 1 + enabledIndices.length) % enabledIndices.length
                ];
          return next ?? -1;
        });
      }

      if (event.key === "Enter" && focusIndex >= 0) {
        event.preventDefault();
        const item = items[focusIndex];
        if (item && !item.disabled) {
          item.onClick();
          close();
        }
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, items, focusIndex, close]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      {trigger({ open, toggle })}
      <AnimatePresence>
        {open && (
          <motion.div
            key="dropdown-menu"
            id={menuId}
            role="menu"
            aria-label={menuLabel}
            initial={
              reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -4 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -4 }
            }
            transition={getMotionTransition("fast")}
            className={cn(
              "absolute top-full z-50 mt-1 min-w-44 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg",
              align === "end" && "right-0",
              className,
            )}
          >
            {items.map((item, index) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  item.variant === "danger"
                    ? "text-danger hover:bg-danger-soft"
                    : "text-foreground hover:bg-accent-soft",
                  focusIndex === index && "bg-accent-soft",
                )}
                onClick={() => {
                  if (item.disabled) return;
                  item.onClick();
                  close();
                }}
                onMouseEnter={() => setFocusIndex(index)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
