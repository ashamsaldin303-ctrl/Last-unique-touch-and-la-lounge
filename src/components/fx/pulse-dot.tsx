'use client'

import type { CSSProperties } from 'react'

/**
 * PulseDot — the "alive" availability dot: a solid dot with an
 * expanding halo ring (CSS ping). For "متاح الآن / available",
 * live-status rows, booking calendars. Reduced-motion: static dot.
 */
export function PulseDot({
  className,
  tint = '#34d399',
  size = 8,
}: {
  className?: string
  tint?: string
  size?: number
}) {
  return (
    <span
      aria-hidden
      className={`lux-pulse-dot inline-block shrink-0 ${className ?? ''}`}
      style={{ '--dot-tint': tint, width: size, height: size } as CSSProperties}
    />
  )
}
