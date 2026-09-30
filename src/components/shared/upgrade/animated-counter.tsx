'use client'

/**
 * AnimatedCounter — counts up from 0 to `value` when the element scrolls into
 * view (IntersectionObserver + requestAnimationFrame easing). Supports a
 * prefix/suffix ("+", "KWD") and renders the final static value for SEO and
 * reduced-motion users (plain text as the accessible label).
 */

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedCounterProps {
  value: number
  /** Duration of the count-up in ms */
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  /** Additional classes for the static label (sr-only unless overridden) */
}

export function AnimatedCounter({
  value,
  duration = 1600,
  prefix = '',
  suffix = '',
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  useEffect(() => {
    if (!started) return

    // Reduced motion: jump straight to the final value (inside a rAF callback
    // so no synchronous setState-in-effect).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const id = requestAnimationFrame(() => setDisplay(value))
      return () => cancelAnimationFrame(id)
    }

    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // easeOutExpo for a dramatic fast start + soft landing
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplay(Math.round(value * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started, value, duration])

  return (
    <span
      ref={ref}
      className={cn('tabular-nums animate-stat-pop', className)}
      aria-label={`${prefix}${value}${suffix}`}
    >
      {prefix}
      {display.toLocaleString('en-US')}
      {suffix}
    </span>
  )
}
