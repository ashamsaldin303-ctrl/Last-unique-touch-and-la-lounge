'use client'

/**
 * TiltCard — subtle 3D perspective tilt that follows the pointer, with a
 * radial glare highlight. Motion per emil-design-eng: the tilt is lerped
 * (exponential smoothing) in a rAF loop so it carries momentum instead of
 * snapping to the pointer. Disabled for touch pointers and reduced-motion
 * users (falls back to plain card).
 */

import { useRef, type ReactNode, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

interface TiltCardProps {
  children: ReactNode
  className?: string
  /** Max tilt in degrees */
  max?: number
  style?: CSSProperties
}

export function TiltCard({ children, className, max = 8, style }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const target = useRef({ rx: 0, ry: 0, gx: 50, gy: 50, glare: 0 })
  const current = useRef({ rx: 0, ry: 0, gx: 50, gy: 50, glare: 0 })
  const frame = useRef(0)
  const running = useRef(false)

  /** Lerp loop — exponential smoothing toward the target (emil: momentum). */
  const tick = () => {
    const el = ref.current
    if (!el) {
      running.current = false
      return
    }
    const t = target.current
    const c = current.current
    const k = 0.18 // smoothing factor: higher = snappier, lower = floatier
    c.rx += (t.rx - c.rx) * k
    c.ry += (t.ry - c.ry) * k
    c.gx += (t.gx - c.gx) * k
    c.gy += (t.gy - c.gy) * k
    c.glare += (t.glare - c.glare) * k

    const settled =
      Math.abs(t.rx - c.rx) < 0.01 &&
      Math.abs(t.ry - c.ry) < 0.01 &&
      Math.abs(t.glare - c.glare) < 0.01

    el.style.transform = `perspective(900px) rotateX(${c.rx.toFixed(2)}deg) rotateY(${c.ry.toFixed(2)}deg) translateY(${(-6 * (Math.abs(c.rx) + Math.abs(c.ry)) / (max * 2)).toFixed(2)}px)`
    el.style.setProperty('--glare-x', `${c.gx.toFixed(1)}%`)
    el.style.setProperty('--glare-y', `${c.gy.toFixed(1)}%`)
    el.style.setProperty('--glare-opacity', c.glare.toFixed(2))

    if (settled) {
      if (t.rx === 0 && t.ry === 0) el.style.transform = ''
      running.current = false
      return
    }
    frame.current = requestAnimationFrame(tick)
  }

  const kick = () => {
    if (!running.current) {
      running.current = true
      frame.current = requestAnimationFrame(tick)
    }
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Pointer-type check: skip touch dragging (scroll must win on mobile).
    if (e.pointerType !== 'mouse') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width // 0..1
    const py = (e.clientY - rect.top) / rect.height // 0..1
    target.current = {
      rx: -(py - 0.5) * 2 * max,
      ry: (px - 0.5) * 2 * max,
      gx: px * 100,
      gy: py * 100,
      glare: 1,
    }
    kick()
  }

  const onLeave = () => {
    target.current = { rx: 0, ry: 0, gx: 50, gy: 50, glare: 0 }
    kick()
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn(
        'tilt-card relative transition-transform duration-300 ease-out will-change-transform',
        className
      )}
      style={{
        // Glare layer driven by CSS vars set from JS
        ['--glare-opacity' as string]: '0',
        ...style,
      }}
    >
      {children}
      {/* Radial glare */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: 'var(--glare-opacity, 0)',
          background:
            'radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.16), transparent 55%)',
        }}
      />
    </div>
  )
}
