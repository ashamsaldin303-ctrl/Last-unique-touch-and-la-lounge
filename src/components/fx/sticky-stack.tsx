'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'

/**
 * StickyStack — cards arrive over their predecessors and PIN; earlier
 * cards recede (scale + dim) as each successor covers them — the
 * "stacked filmstrip" pattern from ercankeskinx's five scroll sections.
 *
 * Usage: <StickyStack>{[<CardA/>, <CardB/>, <CardC/>]}</StickyStack>
 * Items should be equal-height blocks. Cards get subtle top offsets so
 * the pinned edge is visible on each.
 */
export function StickyStack({
  children,
  className,
  /** px from viewport top where each card pins */
  offset = 104,
  /** how much earlier cards shrink as the stack builds */
  recess = 0.045,
  /** px each successive card peeks lower */
  step = 14,
}: {
  children: ReactNode
  className?: string
  offset?: number
  recess?: number
  step?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })
  const items = Array.isArray(children) ? children : [children]

  return (
    <div ref={ref} className={className}>
      {items.map((child, i) => (
        <StackItem
          key={i}
          index={i}
          total={items.length}
          progress={scrollYProgress}
          offset={offset}
          recess={recess}
          step={step}
          last={i === items.length - 1}
        >
          {child}
        </StackItem>
      ))}
    </div>
  )
}

function StackItem({
  index,
  total,
  progress,
  offset,
  recess,
  step,
  last,
  children,
}: {
  index: number
  total: number
  progress: MotionValue<number>
  offset: number
  recess: number
  step: number
  last: boolean
  children: ReactNode
}) {
  // As overall progress passes this card's "coverage point", it recedes.
  const from = index / total
  const scale = useTransform(progress, [from, 1], [1, 1 - recess * (total - index)])
  const dim = useTransform(
    progress,
    [from, Math.min(from + 1 / total, 1)],
    [1, last ? 1 : 0.82 - 0.18 * (index / Math.max(total - 1, 1))],
  )

  return (
    <motion.div
      style={{
        position: 'sticky',
        top: offset + index * step,
        scale,
        opacity: dim,
        zIndex: index + 1,
      }}
      className={last ? '' : 'pb-6'}
    >
      {children}
    </motion.div>
  )
}
