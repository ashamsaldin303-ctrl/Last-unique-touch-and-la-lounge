"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from "framer-motion";

/**
 * Tilt — physics-based 3D tilt with a roaming specular highlight.
 * Spring-smoothed so it feels like weighted glass, not a cheap flip.
 */
export function Tilt({
  children,
  className,
  max = 10,
  glare = true,
  scale = 1.02,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
  scale?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5); // normalized pointer pos
  const py = useMotionValue(0.5);

  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), {
    stiffness: 180,
    damping: 22,
    mass: 0.6,
  });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), {
    stiffness: 180,
    damping: 22,
    mass: 0.6,
  });

  // specular highlight follows the pointer
  const glareX = useTransform(px, [0, 1], ["18%", "82%"]);
  const glareY = useTransform(py, [0, 1], ["18%", "82%"]);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(232,207,143,0.15), transparent 55%)`;

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };

  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={className}
      style={{
        rotateX: rx,
        rotateY: ry,
        transformStyle: "preserve-3d",
        perspective: 900,
      }}
      whileHover={{ scale }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: glareBg }}
        />
      )}
    </motion.div>
  );
}
