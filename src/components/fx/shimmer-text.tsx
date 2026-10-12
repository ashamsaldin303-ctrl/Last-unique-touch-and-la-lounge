'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useInView } from 'framer-motion'

/**
 * ShimmerText — a champagne gloss sweeps across the text (once
 * automatically on view-entry, and again on every hover). The letters
 * themselves are untouched — it is light moving over ink, so it is
 * fully Arabic-safe (joined glyphs render normally; the gradient is
 * clipped to the text box).
 */
export function ShimmerText({
  children,
  className,
  /** play one sweep automatically on view-entry */
  auto = true,
}: {
  children: ReactNode
  className?: string
  auto?: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const [lit, setLit] = useState(false)

  useEffect(() => {
    if (auto && inView) {
      const id = window.setTimeout(() => setLit(true), 120)
      return () => window.clearTimeout(id)
    }
  }, [auto, inView])

  return (
    <span
      ref={ref}
      className={`lux-shimmer ${lit ? 'lux-shimmer-lit' : ''} ${className ?? ''}`}
    >
      {children}
    </span>
  )
}
