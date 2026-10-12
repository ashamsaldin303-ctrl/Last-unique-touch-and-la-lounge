'use client'

import { useId, useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

/**
 * RotatingBadge — circular text ring that rotates slowly (CSS) or locks
 * to scroll (one full turn across the viewport). Arabic-safe: textPath
 * renders joined glyphs in the DOM — no per-letter splitting.
 *
 * children (optional) render in the center — an icon, a diamond.
 */
export function RotatingBadge({
  text,
  size = 112,
  /** seconds per revolution (ignored when scrollLinked) */
  duration = 26,
  scrollLinked = false,
  className,
  children,
}: {
  text: string
  size?: number
  duration?: number
  scrollLinked?: boolean
  className?: string
  children?: ReactNode
}) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const spin = useTransform(scrollYProgress, [0, 1], [0, 360])

  return (
    <div
      ref={ref}
      className={`relative select-none ${className ?? ''}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <motion.div
        className="absolute inset-0"
        style={scrollLinked ? { rotate: spin } : undefined}
      >
        {!scrollLinked && (
          <div className="lux-rotate-slow absolute inset-0" style={{ animationDuration: `${duration}s` }}>
            <RingText id={id} text={text} />
          </div>
        )}
        {scrollLinked && <RingText id={id} text={text} />}
      </motion.div>
      {children && (
        <div className="absolute inset-0 grid place-items-center">{children}</div>
      )}
    </div>
  )
}

function RingText({ id, text }: { id: string; text: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <defs>
        <path
          id={id}
          d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
          fill="none"
        />
      </defs>
      <text
        className="fill-current"
        style={{ fontSize: '8.2px', letterSpacing: '0.24em', fontWeight: 600 }}
      >
        <textPath href={`#${id}`}>{text}</textPath>
      </text>
    </svg>
  )
}
