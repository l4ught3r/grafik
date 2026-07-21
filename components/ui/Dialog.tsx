"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { getMotionTransition } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  secondaryAction?: { label: string; onClick: () => void };
  variant?: "default" | "danger";
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  onConfirm,
  secondaryAction,
  variant = "default",
}: DialogProps) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleClose = () => {
    onClose();
  };

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const handleSecondary = () => {
    secondaryAction?.onClick();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className={cn(
        "fixed inset-0 z-50 m-auto w-full max-w-md border-0 bg-transparent p-0 shadow-none backdrop:bg-foreground/20 backdrop:transition-opacity",
        "open:backdrop:opacity-100",
      )}
    >
      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            key="dialog-panel"
            initial={
              reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }
            }
            transition={getMotionTransition("normal")}
            className="rounded-xl border border-border bg-surface p-6 shadow-lg"
          >
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {description && (
              <p className="mt-2 text-sm text-muted">{description}</p>
            )}
            {children && <div className="mt-4">{children}</div>}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={handleClose}>
                {cancelLabel}
              </Button>
              {secondaryAction && (
                <Button variant="secondary" onClick={handleSecondary}>
                  {secondaryAction.label}
                </Button>
              )}
              {onConfirm && (
                <Button
                  variant={variant === "danger" ? "danger" : "primary"}
                  onClick={handleConfirm}
                >
                  {confirmLabel}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>
  );
}
