'use client'

import { useState, type ReactNode } from 'react'

/**
 * FlipCard — a 3D coin-flip between a front and back face (hover on
 * fine pointers, tap on touch, keyboard focus). Faces keep their own
 * rounded corners via [border-radius:inherit] on the inner wrapper.
 */
export function FlipCard({
  front,
  back,
  className,
  height = 'auto',
}: {
  front: ReactNode
  back: ReactNode
  className?: string
  /** explicit height when content is absolute-positioned */
  height?: string
}) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      className={`group [perspective:1400px] ${className ?? ''}`}
      style={height !== 'auto' ? { height } : undefined}
      tabIndex={0}
      role="group"
      onClick={() => setFlipped((f) => !f)}
      onFocus={() => setFlipped(true)}
      onBlur={() => setFlipped(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setFlipped((f) => !f)
        }
      }}
    >
      <div
        className={`relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div className="absolute inset-0 [backface-visibility:hidden]">{front}</div>
        <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
          {back}
        </div>
      </div>
    </div>
  )
}
