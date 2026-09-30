'use client'

/**
 * ScrollProgress v2 — a slim gold gradient bar pinned under the navbar that
 * fills as the user scrolls (scaleX driven by framer-motion useScroll), now
 * with a comet head: a blurred golden glow that rides the leading edge of
 * the fill (direction-aware: follows the inline-start origin, so RTL fills
 * from the right correctly). The comet is a SIBLING of the scaled bar —
 * nesting it inside would distort it with scaleX.
 */

import { motion, useScroll, useSpring, useTransform } from 'framer-motion'

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 })
  // Leading-edge position: 0% → 100% of the viewport width, measured from
  // the inline-start edge (matches the bar's transform-origin in both dirs).
  const cometX = useTransform(scrollYProgress, (v) => `${Math.min(v, 1) * 100}%`)
  const cometOpacity = useTransform(scrollYProgress, [0, 0.01, 0.995, 1], [0, 1, 1, 0])

  return (
    <div aria-hidden="true" className="fixed top-0 inset-x-0 z-[60] h-[3px] pointer-events-none">
      <motion.div
        style={{ scaleX }}
        className="scroll-progress-bar absolute inset-0 bg-gradient-to-r from-primary/70 via-primary to-primary/70"
      />
      {/* Comet head riding the leading edge */}
      <motion.div
        style={{ insetInlineStart: cometX, opacity: cometOpacity }}
        className="absolute top-1/2 w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/40 blur-[10px]"
      />
    </div>
  )
}
