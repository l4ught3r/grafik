"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { getMotionDuration, motionTokens } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

interface AnimatedResizeProps {
  children: ReactNode;
  className?: string;
}

/** Плавное изменение высоты при изменении содержимого (без open/close). */
export function AnimatedResize({ children, className }: AnimatedResizeProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const updateHeight = () => {
      setHeight(node.scrollHeight);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "overflow-hidden transition-[height] duration-200 ease-out",
        className,
      )}
      style={{ height }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

interface AnimatedCollapseProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function AnimatedCollapse({
  open,
  children,
  className,
  contentClassName,
}: AnimatedCollapseProps) {
  const reduceMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node || !open) return;

    const updateHeight = () => {
      setHeight(node.scrollHeight);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open]);

  const duration = getMotionDuration("normal");
  const yOffset = reduceMotion ? 0 : motionTokens.distance.sm;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="collapse"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: reduceMotion ? "auto" : height }}
          exit={{ opacity: 0, height: 0 }}
          transition={{
            opacity: { duration, ease: motionTokens.easing.smooth },
            height: { duration, ease: motionTokens.easing.smooth },
          }}
          className={cn("overflow-hidden", className)}
        >
          <motion.div
            initial={{ opacity: 0, y: yOffset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: yOffset }}
            transition={{ duration, ease: motionTokens.easing.smooth }}
            className={contentClassName}
          >
            <div ref={contentRef}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
