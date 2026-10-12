'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

/**
 * ScrollImage — the image drifts slower than the page inside its mask
 * (parallax travel + counter-scale so edges never show). The house's
 * "depth without weight" layer for tall showcase imagery.
 *
 * Wrap an Image (fill) or img. Combines cleanly under ClipReveal
 * (ClipReveal on the outside handles the reveal; ScrollImage inside
 * handles the living parallax).
 */
export function ScrollImage({
  children,
  className,
  /** % of inner height the image travels across the mask (0 → travel → 0) */
  travel = 8,
  /** covers the travel band so no edge ever shows */
  scale = 1.2,
}: {
  children: ReactNode
  className?: string
  travel?: number
  scale?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [`${-travel}%`, `${travel}%`])

  return (
    <div ref={ref} className={`overflow-hidden ${className ?? ''}`}>
      <motion.div style={{ y, scale }} className="h-full w-full">
        {children}
      </motion.div>
    </div>
  )
}
