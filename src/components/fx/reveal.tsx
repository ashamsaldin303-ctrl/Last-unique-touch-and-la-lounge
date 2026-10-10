"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Reveal — scroll-triggered entrance with configurable direction & blur.
 * Used universally across sections for a cohesive choreography.
 */
type Direction = "up" | "down" | "start" | "end" | "none" | "scale";

const offsets: Record<Direction, { x?: number; y?: number; scale?: number }> = {
  up: { y: 44 },
  down: { y: -44 },
  start: { x: 56 },
  end: { x: -56 },
  none: {},
  scale: { scale: 0.92 },
};

export function Reveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.9,
  className,
  once = true,
  amount = 0.25,
}: {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  amount?: number;
}) {
  const off = offsets[direction];
  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        filter: "blur(10px)",
        ...off,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: {
          duration,
          delay,
          ease: [0.22, 1, 0.36, 1],
        },
      }}
      viewport={{ once, amount }}
    >
      {children}
    </motion.div>
  );
}

/** Stagger container — children animate in sequence */
export const staggerParent: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 36, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};
