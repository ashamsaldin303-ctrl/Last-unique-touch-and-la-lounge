'use client'

/**
 * AnimatedCounter — counts up from 0 to `value` when the element scrolls into
 * view (IntersectionObserver + requestAnimationFrame easing). Supports a
 * prefix/suffix ("+", "KWD") and renders the final static value for SEO and
 * screen readers (a dedicated sr-only copy — an aria-label on a generic
 * <span> is not reliably exposed by assistive tech).
 */

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'
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
  // Last rendered count — a live value change animates the DELTA from here
  // instead of restarting the whole count from 0 (admin KPIs update while
  // visible).
  const displayRef = useRef(0)
  const { locale } = useI18n()
  // Locale-aware grouping; `-u-nu-latn` keeps Latin numerals under Arabic
  // (the site's established price-formatting convention).
  const numberLocale = locale === 'ar' ? 'ar-KW-u-nu-latn' : 'en-US'

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
      const id = requestAnimationFrame(() => {
        displayRef.current = value
        setDisplay(value)
      })
      return () => cancelAnimationFrame(id)
    }

    // Animate the delta from the currently shown value (not from 0) so a
    // live update eases between the old and new numbers.
    const from = displayRef.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // easeOutExpo for a dramatic fast start + soft landing
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      const next = Math.round(from + (value - from) * eased)
      displayRef.current = next
      setDisplay(next)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started, value, duration])

  return (
    <span ref={ref} className={cn('tabular-nums animate-stat-pop', className)}>
      {/* Visible animated value (hidden from assistive tech — the sr-only
          copy below carries the final static value). */}
      <span aria-hidden="true">
        {prefix}
        {display.toLocaleString(numberLocale)}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {value.toLocaleString(numberLocale)}
        {suffix}
      </span>
    </span>
  )
}
