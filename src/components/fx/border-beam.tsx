'use client'

import type { CSSProperties } from 'react'

/**
 * BorderBeam — a champagne light beam endlessly orbits the border ring
 * (conic sweep masked to a 1.5px ring). Mount INSIDE a `relative`
 * parent; radius follows the parent's rounded-*.
 *
 * Graceful degradation: browsers without @property animate nothing
 * (beam simply stays invisible — never breaks layout).
 */
export function BorderBeam({
  className,
  /** seconds per full orbit */
  duration = 5,
  /** beam head position around the ring, as % of 360deg */
  size = 88,
  tint = 'rgba(232,207,143,0.95)',
  /** ring thickness in px */
  thickness = 1.5,
}: {
  className?: string
  duration?: number
  size?: number
  tint?: string
  thickness?: number
}) {
  return (
    <span
      aria-hidden
      className={`lux-beam pointer-events-none ${className ?? ''}`}
      style={
        {
          animationDuration: `${duration}s`,
          '--beam-size': `${size}%`,
          '--beam-tint': tint,
          '--beam-thickness': `${thickness}px`,
        } as CSSProperties
      }
    />
  )
}
