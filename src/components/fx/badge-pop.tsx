'use client'

import { motion } from 'framer-motion'
import { springSnappy } from '@/lib/motion'

/**
 * BadgePop — a count badge that POPS (scale spring) every time its
 * value changes: the cart filling up becomes a physical event.
 * Mount it where the raw number used to be; key={value} re-mounts
 * on each change so the spring fires exactly once per update.
 */
export function BadgePop({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  if (value <= 0) return null
  return (
    <motion.span
      key={value}
      initial={{ scale: 1.6 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={springSnappy}
      className={`absolute grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground tabular-nums ${className ?? ''}`}
      aria-hidden
    >
      {value > 99 ? '99+' : value}
    </motion.span>
  )
}

/**
 * PopOnMount — generic one-shot pop for any child (icons, dots).
 */
export function PopOnMount({
  children,
  className,
  from = 0.4,
}: {
  children: React.ReactNode
  className?: string
  from?: number
}) {
  return (
    <motion.span
      initial={{ scale: from, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={springSnappy}
      className={`inline-flex ${className ?? ''}`}
    >
      {children}
    </motion.span>
  )
}
