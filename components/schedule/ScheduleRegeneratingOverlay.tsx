"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Spinner } from "@/components/ui/Spinner";
import { getMotionTransition } from "@/lib/motion-tokens";

interface ScheduleRegeneratingOverlayProps {
  visible: boolean;
}

export function ScheduleRegeneratingOverlay({
  visible,
}: ScheduleRegeneratingOverlayProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="regen-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={getMotionTransition("fast")}
          className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-surface/70 backdrop-blur-[2px] print:hidden"
        >
          <motion.div
            initial={
              reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }
            }
            transition={getMotionTransition("normal")}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm"
          >
            <Spinner />
            <span className="text-sm text-muted">Пересчёт графика…</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
