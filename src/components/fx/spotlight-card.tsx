'use client'

import { useRef, type CSSProperties, type ReactNode } from 'react'

/**
 * SpotlightCard — a champagne highlight roams the surface, tracking the
 * cursor (the pointer writes CSS variables directly; zero re-renders).
 *
 * Layering: the glow paints in ::before so cards can keep their own
 * backgrounds. Hover-only (no glow on touch devices).
 */
export function SpotlightCard({
  children,
  className,
  /** highlight color — keep in the champagne family for the house */
  tint = 'rgba(232,207,143,0.13)',
  /** glow radius in px */
  radius = 320,
}: {
  children: ReactNode
  className?: string
  tint?: string
  radius?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--spot-x', `${e.clientX - r.left}px`)
    el.style.setProperty('--spot-y', `${e.clientY - r.top}px`)
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={`lux-spotlight ${className ?? ''}`}
      style={{ '--spot-tint': tint, '--spot-radius': `${radius}px` } as CSSProperties}
    >
      {children}
    </div>
  )
}
