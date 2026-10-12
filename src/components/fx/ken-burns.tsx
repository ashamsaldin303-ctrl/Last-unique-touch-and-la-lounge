'use client'

import type { CSSProperties, ReactNode } from 'react'

/**
 * KenBurns — slow ambient zoom + drift loop for imagery: the "living
 * painting" effect on hero and showcase imagery. Pure CSS animation
 * (GPU transform), direction variants, honors prefers-reduced-motion
 * (renders the static image).
 *
 * Wrap an Image / img. The child should fill the wrapper
 * (h-full w-full object-cover).
 */
export function KenBurns({
  children,
  className,
  /** seconds per breath (one direction) */
  duration = 22,
  /** 'a' = push in + rise · 'b' = pull back + drift */
  variant = 'a',
  /** peak zoom amount */
  scale = 1.12,
  style,
}: {
  children: ReactNode
  className?: string
  duration?: number
  variant?: 'a' | 'b'
  scale?: number
  style?: CSSProperties
}) {
  return (
    <div className={`overflow-hidden ${className ?? ''}`} style={style}>
      <div
        className="lux-kenburns h-full w-full"
        data-variant={variant}
        style={{ '--kb-duration': `${duration}s`, '--kb-scale': String(scale) } as CSSProperties}
      >
        {children}
      </div>
    </div>
  )
}
