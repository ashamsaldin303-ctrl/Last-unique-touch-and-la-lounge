'use client'

/**
 * LiquidTabsList — the prompt-motion signature tab technique (T1), taken
 * from the gallery's second most-liked video ("Shape morphing through
 * UI states", twoclipping, 12k likes):
 *
 *   "The tab indicator's two edges ride different springs, so the leading
 *    edge stretches ahead of the trailing one."
 *
 * A drop-in replacement for `TabsList`: it observes Radix's
 * `data-state="active"` attribute flips on its trigger children and
 * slides a shared indicator whose LEADING edge races on a stiff spring
 * while the TRAILING edge follows on a softer one — the pill visibly
 * stretches toward the direction of travel, then equalizes. Direction is
 * derived from the physical delta, so it is RTL-aware by construction.
 *
 * Fully imperative: measurement drives motion values directly (no state,
 * no re-render churn — setState-in-effect is avoided by design).
 * reducedMotion users get instant, non-animated placement (MotionConfig
 * can't reach imperative motion values, so handled here).
 */

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
} from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  animate,
} from 'framer-motion'
import { TabsList } from '@/components/ui/tabs'
import { liquidLeading, liquidTrailing } from '@/lib/motion'
import { cn } from '@/lib/utils'

export interface LiquidTabsListProps extends HTMLAttributes<HTMLDivElement> {
  /** Indicator style. `pill` fills the active trigger; `underline`
   *  draws a 2px bar on the list's bottom edge (for borderless tab
   *  bars). Both ride the same two-edge springs. */
  variant?: 'pill' | 'underline'
  /** Classes for the indicator itself (color/shadow). */
  indicatorClassName?: string
}

export function LiquidTabsList({
  variant = 'pill',
  indicatorClassName,
  className,
  children,
  ...props
}: LiquidTabsListProps) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const reduceMotion = useReducedMotion()

  /* The indicator's two edges as independent motion values — the whole
     liquid effect lives in this pair. No state: measurement writes the
     values imperatively. */
  const startX = useMotionValue(0)
  const endX = useMotionValue(0)
  const width = useTransform([startX, endX], ([s, e]: number[]) =>
    Math.max(e - s, 0)
  )

  const lastStartRef = useRef<number | null>(null)

  /** measure() — reads the active trigger geometry (physical px, so RTL
   *  needs no branches) and drives the two springs:
   *  first paint → instant placement; later flips → the edge moving
   *  TOWARD the target rides the stiff spring (leading, stretches
   *  ahead), the opposite edge rides the soft one (trailing, catches
   *  up) — the indicator squashes toward travel, then equalizes. */
  const measure = () => {
    const list = listRef.current
    if (!list) return
    const trigger = list.querySelector<HTMLElement>('[data-state="active"]')
    if (!trigger) {
      // No active tab (e.g. uncontrolled before mount) — zero the ink.
      startX.set(0)
      endX.set(0)
      lastStartRef.current = null
      return
    }
    const lRect = list.getBoundingClientRect()
    const tRect = trigger.getBoundingClientRect()
    const nextStart = tRect.left - lRect.left
    const nextEnd = tRect.right - lRect.left

    if (lastStartRef.current === null || reduceMotion) {
      startX.set(nextStart)
      endX.set(nextEnd)
    } else {
      const goingRight = nextStart >= lastStartRef.current
      const leading = goingRight ? endX : startX
      const trailing = goingRight ? startX : endX
      const leadingTarget = goingRight ? nextEnd : nextStart
      const trailingTarget = goingRight ? nextStart : nextEnd
      animate(leading, leadingTarget, liquidLeading)
      animate(trailing, trailingTarget, liquidTrailing)
    }
    lastStartRef.current = nextStart
  }

  /* Radix flips data-state on triggers → MutationObserver catches every
     tab change (value flips, mount, locale swap re-render). */
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    measure()
    const observer = new MutationObserver(() => measure())
    observer.observe(list, {
      attributes: true,
      attributeFilter: ['data-state'],
      subtree: true,
      childList: true,
    })
    return () => observer.disconnect()
  }, [])

  /* Re-measure on any resize (viewport, font swap, sidebar). Instant
     placement — a resize is not a travel. */
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const onResize = () => {
      lastStartRef.current = null // force instant re-place
      measure()
    }
    const observer = new ResizeObserver(onResize)
    observer.observe(list)
    return () => observer.disconnect()
  }, [])

  return (
    <TabsList ref={listRef} className={cn('relative', className)} {...props}>
      {/* The liquid ink — width 0 until the first measure, so nothing
          flashes on SSR/first paint. */}
      <motion.span
        aria-hidden="true"
        data-liquid-indicator
        style={{ left: startX, width }}
        className={cn(
          'pointer-events-none z-0',
          variant === 'underline'
            ? 'absolute bottom-0 h-[2px] rounded-full bg-primary'
            : 'absolute top-1 bottom-1 rounded-md bg-background shadow-sm',
          indicatorClassName
        )}
      />
      {children}
    </TabsList>
  )
}
