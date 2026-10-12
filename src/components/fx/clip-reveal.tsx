'use client'

/**
 * ClipReveal (Task 43, prompt-motion round 2).
 *
 * Source pattern — pankajkumar-dev "Poster breaking its frame":
 *   "a poster breaking out of its own frame."
 *
 * On scroll-into-view the image's frame EXPANDS from an inset window
 * (clip-path) to full while the inner image counter-zooms from 1.22 —
 * the poster punches forward out of its crop, never a plain fade.
 * Direction-neutral, reduced-motion safe via MotionConfig (framer
 * converts to opacity-only), and clip-path is GPU-cheap.
 */

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { easeExpoOut } from '@/lib/motion'
import { cn } from '@/lib/utils'

export function ClipReveal({
  children,
  className,
  innerClassName,
  delay = 0,
  duration = 1.05,
  once = true,
}: {
  children: ReactNode
  className?: string
  innerClassName?: string
  delay?: number
  duration?: number
  once?: boolean
}) {
  return (
    <motion.div
      className={cn('relative overflow-hidden', className)}
      initial={{ clipPath: 'inset(14% 10% 12% 10% round 10px)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0% round 0px)' }}
      viewport={{ once, margin: '-8% 0px' }}
      transition={{ duration, ease: easeExpoOut, delay }}
    >
      <motion.div
        className={cn('h-full w-full', innerClassName)}
        initial={{ scale: 1.22 }}
        whileInView={{ scale: 1 }}
        viewport={{ once, margin: '-8% 0px' }}
        transition={{ duration: duration * 1.15, ease: easeExpoOut, delay }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
