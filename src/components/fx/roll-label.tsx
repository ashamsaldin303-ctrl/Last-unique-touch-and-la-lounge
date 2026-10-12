'use client'

/**
 * RollLabel (Task 43, prompt-motion round 2).
 *
 * Source pattern — official showreel template:
 *   "shapes, type and color **transform into the next scene** instead
 *    of cutting or fading."
 * The CTA label transforms: on group-hover the visible label rolls up
 * and out of its mask while an identical twin rolls in from below —
 * a continuous vertical motion, zero cuts. The mask carries
 * descender room (pb/-mb compensation) so Arabic glyphs (ي، ج، ق)
 * never clip mid-roll.
 *
 * Consumes the caller's `group` + `group-hover` utilities — wrap the
 * interactive element with `group` and this label reacts.
 */

import { cn } from '@/lib/utils'

export function RollLabel({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const shift = 'group-hover:-translate-y-[calc(100%+0.14em)]'
  const enter = 'group-hover:translate-y-0'
  return (
    <span
      className={cn(
        'relative inline-block overflow-hidden align-baseline pb-[0.18em] -mb-[0.18em]',
        className,
      )}
    >
      {/* outgoing copy */}
      <span
        className={cn(
          'block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
          shift,
        )}
      >
        {text}
      </span>
      {/* incoming twin — parked one label-height below the mask */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 top-0 block translate-y-[calc(100%+0.14em)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
          enter,
        )}
      >
        {text}
      </span>
    </span>
  )
}
