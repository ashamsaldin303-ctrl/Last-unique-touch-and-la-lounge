'use client'

/**
 * MorphNumber — numbers that follow a real spring (T10), from the
 * "Orange dot motion system" prompt (ultimaxbt):
 *
 *   "Draw the graph from the same spring function that moves the dot…
 *    it overshoots the target and settles beside a +22% callout."
 *
 * The displayed figure IS the spring: a step integration of
 * x'' = -k(x−target) − c·x', so totals land with a *tiny* overshoot
 * (≈3%) and settle — never a linear tween, never a bounce. Retargeting
 * mid-flight starts from the LIVE value (the "sum of springs" behaviour
 * the gallery prescribes for values that change target many times).
 *
 * Hydration-safe: the first render outputs the formatted target exactly
 * (server markup === first client paint). Reduced-motion / instant
 * modes jump via the official render-phase adjustment pattern (no
 * setState-in-effect); the spring itself only ever updates state from
 * inside requestAnimationFrame — an async external system.
 */

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/** Spring constants — tuned for a settle in ~600ms with ~3% overshoot. */
const STIFFNESS = 170
const DAMPING = 19 // ζ ≈ 0.9 → slight, tasteful overshoot
const MASS = 1

/** Sub-frame-accurate RAF spring integration (dt-capped for stability). */
function springTo(
  from: number,
  to: number,
  onUpdate: (v: number) => void,
  onDone: () => void
): () => void {
  let value = from
  let velocity = 0
  let last = performance.now()
  let raf = requestAnimationFrame(tick)
  function tick(now: number) {
    const dt = Math.min((now - last) / 1000, 1 / 30)
    last = now
    const force = -STIFFNESS * (value - to) - DAMPING * velocity
    velocity += (force / MASS) * dt
    value += velocity * dt
    // Settled: within a hair of the target and nearly at rest.
    if (Math.abs(value - to) < 0.0005 && Math.abs(velocity) < 0.01) {
      onUpdate(to)
      onDone()
      return
    }
    onUpdate(value)
    raf = requestAnimationFrame(tick)
  }
  return () => cancelAnimationFrame(raf)
}

export interface MorphNumberProps {
  value: number
  /** Formatter for the current spring value (money, counts…). */
  format?: (v: number) => string
  className?: string
  /** Skip the spring entirely (a11y contexts render plain numbers). */
  instant?: boolean
}

export function MorphNumber({
  value,
  format,
  className,
  instant = false,
}: MorphNumberProps) {
  const reduceMotion = useReducedMotion()
  const fmt = format ?? ((v: number) => String(Math.round(v)))
  const [display, setDisplay] = useState(value)
  const displayRef = useRef(value)

  /* Instant modes jump during render (official "adjust state when a
     prop changes" pattern — never an effect): reduced-motion and
     `instant` consumers get plain number swaps. The spring's start
     point re-syncs in the effect below (refs never written in render). */
  const jumped = instant || reduceMotion
  if (jumped && display !== value) {
    setDisplay(value)
  }

  /* The spring: a RAF subscription from the LIVE value to the target.
     Mount with a stable target settles in one frame (a no-op state
     set — React bails out, so server markup stays intact). */
  useEffect(() => {
    if (jumped || !Number.isFinite(value)) {
      displayRef.current = value
      return
    }
    const cancel = springTo(
      displayRef.current,
      value,
      (v) => {
        displayRef.current = v
        setDisplay(v) // inside RAF — async, never cascading
      },
      () => {
        displayRef.current = value
      }
    )
    return cancel
  }, [value, jumped])

  return <span className={className}>{fmt(display)}</span>
}
