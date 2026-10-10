'use client'

/**
 * HighlightSweep — the accent highlighter from the "Prompt Motion site
 * promo" prompt (antonio-kodheli):
 *
 *   "A solid accent highlighter sweeps one phrase."
 *
 * A solid accent bar sweeps in behind its text on first scroll-into-view
 * (the sweep starts at the READING edge — right in RTL, left in LTR —
 * like a marker crossing the line), then the phrase settles above it.
 * Reduced-motion users see the full highlight statically (MotionConfig
 * flips the transform to an instant state).
 *
 * Screen readers: pure decoration — the text node itself is untouched.
 */

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { springSoft } from '@/lib/motion'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface HighlightSweepProps {
  children: ReactNode
  /** Tailwind classes for the highlight bar (color/opacity), e.g.
   *  `bg-primary/25`. Keep it SOLID-ish: prompt-motion bans gradient
   *  decoration on copy. */
  highlightClassName?: string
  className?: string
  /** Extra delay before the sweep (choreography with siblings). */
  delay?: number
}

export function HighlightSweep({
  children,
  highlightClassName = 'bg-primary/30',
  className,
  delay = 0,
}: HighlightSweepProps) {
  const { locale } = useI18n()
  // Sweep originates at the reading edge: physical right for ar, left for en.
  const rtl = locale === 'ar'

  return (
    /* `isolate` — keeps the −z highlight behind the text but safely above
       any ancestor panel backgrounds (glass/backdrop-filter stacking). */
    <span className={cn('relative inline-block isolate', className)}>
      {/* The marker bar — scaleX from the reading edge on a soft spring.
          Slight horizontal bleed (−2% inset-x) reads as a hand-drawn
          overshoot rather than a mechanical box. */}
      <motion.span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-[-0.02em] top-[0.08em] bottom-[0.08em] -z-[1] rounded-[0.35em]',
          highlightClassName
        )}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.9 }}
        transition={{ ...springSoft, delay }}
        style={{ transformOrigin: rtl ? 'right' : 'left' }}
      />
      {children}
    </span>
  )
}
