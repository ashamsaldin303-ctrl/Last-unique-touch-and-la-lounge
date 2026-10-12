'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'

/**
 * Ink ripple — the press "confirms itself": an ink drop expands from the
 * exact press point, then dissolves (house doctrine: no dead clicks).
 *
 * TWO MOUNT MODES:
 *
 * 1. <RippleLayer /> — drop INSIDE a `relative overflow-hidden` parent
 *    (e.g. a Button with `relative overflow-hidden` in its className).
 *    It covers the whole control and spawns drops wherever the press
 *    lands. One line, works on any control.
 *
 * 2. <Ripple> — inline wrapper for plain links/labels that are their
 *    own clipping context.
 *
 * Pointer-typed (mouse/pen only) and reduced-motion gated in CSS.
 */

type Drop = { id: number; x: number; y: number }

const TINT_DEFAULT = 'rgba(232,207,143,0.32)'

function useDrops(duration: number) {
  const [drops, setDrops] = useState<Drop[]>([])
  const seq = useRef(0)

  const spawn = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return
      const r = e.currentTarget.getBoundingClientRect()
      const id = ++seq.current
      setDrops((d) => [...d.slice(-4), { id, x: e.clientX - r.left, y: e.clientY - r.top }])
      window.setTimeout(() => setDrops((d) => d.filter((x) => x.id !== id)), duration + 80)
    },
    [duration],
  )

  return { drops, spawn }
}

/** Mode 1 — absolute overlay for controls (mount inside relative overflow-hidden). */
export function RippleLayer({
  duration = 700,
  tint = TINT_DEFAULT,
  className,
}: {
  duration?: number
  tint?: string
  className?: string
}) {
  const { drops, spawn } = useDrops(duration)
  return (
    <span
      aria-hidden
      onPointerDown={spawn}
      className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className ?? ''}`}
    >
      {drops.map((d) => (
        <span
          key={d.id}
          className="lux-ripple"
          style={{ left: d.x, top: d.y, background: tint, animationDuration: `${duration}ms` }}
        />
      ))}
    </span>
  )
}

/** Mode 2 — inline wrapper (own clipping context). */
export function Ripple({
  children,
  className,
  duration = 700,
  tint = TINT_DEFAULT,
}: {
  children: ReactNode
  className?: string
  duration?: number
  tint?: string
}) {
  const { drops, spawn } = useDrops(duration)
  return (
    <span
      onPointerDown={spawn}
      className={`relative isolate inline-flex overflow-hidden rounded-[inherit] ${className ?? ''}`}
    >
      <span className="relative z-[1] inline-flex items-center">{children}</span>
      {drops.map((d) => (
        <span
          key={d.id}
          className="lux-ripple"
          style={{ left: d.x, top: d.y, background: tint, animationDuration: `${duration}ms` }}
        />
      ))}
    </span>
  )
}
