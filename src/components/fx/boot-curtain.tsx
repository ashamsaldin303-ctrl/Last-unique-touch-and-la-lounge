'use client'

/**
 * BootCurtain — the cinematic boot sequence (Task 43, prompt-motion round 2).
 *
 * Source patterns, verbatim from the gallery:
 *  - dale-vaz "Sahi terminal reveal": "it should start with a single dot on
 *    a black screen" → the maison ignites from ONE GOLD DOT.
 *  - official showreel template: "every shot enters already moving",
 *    "no dead time", "never a still fade" → the counter is eased, the split
 *    is a curtain SNATCHED away (accelerating), not a fade.
 *  - twoclipping: "the camera zooms so each state fills the frame" → the
 *    dot blooms into the wordmark scale.
 *
 * Architecture (flash-free, hydration-safe):
 *  1. A pre-paint inline script (layout.tsx) checks sessionStorage +
 *     prefers-reduced-motion. First visit → adds `.lux-boot-pending` to
 *     <html> and `window.__LUX_BOOT__ = true`. The class paints a full
 *     ink veil + static gold dot from the FIRST paint (CSS ::after) —
 *     the page never flashes before the curtain.
 *  2. This component mounts at hydration: if the class is present it
 *     renders an IDENTICAL ink veil on top, removes the <html> class in
 *     the same commit (seamless handoff), plays the sequence, then
 *     splits the curtain into two accelerating halves.
 *  3. Returning visitors (same session) and reduced-motion users: the
 *     script never adds the class; this component renders nothing.
 *  4. A 6s CSS-side safety (script) guarantees content even if JS dies.
 *
 * Hero choreography is offset by `window.__LUX_BOOT__` (set pre-hydration)
 * so the entrance plays UNDER the lifting curtain, not behind it.
 */

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

type Phase = 'idle' | 'count' | 'split' | 'done'

const COUNT_MS = 1050
const SPLIT_MS = 620

/** Read pre-hydration (inline script) — safe to call during render: it only
 *  affects framer *transition delays*, never the rendered DOM, so SSR and
 *  first client render stay identical (no hydration mismatch). */
export function bootOffset(): number {
  if (typeof window !== 'undefined' && (window as Window).__LUX_BOOT__) return 1250
  return 0
}

declare global {
  interface Window {
    __LUX_BOOT__?: boolean
  }
}

export function BootCurtain() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [pct, setPct] = useState(0)
  const rafRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  /* Mount gate (React-Compiler-safe: setState only inside async
     callbacks — never synchronously in an effect body). The pre-paint
     script owns the veil until our own overlay is actually rendered. */
  useEffect(() => {
    const root = document.documentElement
    const taken = root.dataset.luxBootTaken === '1'
    // First visit only: the pre-paint script left the class. (Dev strict
    // mode re-runs effects — the dataset guard lets the sequence resume.)
    if (!root.classList.contains('lux-boot-pending') && !taken) return
    const id = requestAnimationFrame(() => setPhase('count'))
    return () => cancelAnimationFrame(id)
  }, [])

  /* Phase: COUNT — hand off the CSS veil to the React overlay (in the
     same commit that rendered it), then run the eased counter. */
  useEffect(() => {
    if (phase !== 'count') return
    const root = document.documentElement
    // Mark as owned even if the class was already removed (strict mode).
    root.dataset.luxBootTaken = '1'

    const t0 = performance.now()
    let lastPct = -1
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / COUNT_MS)
      // Exponential ease-out — the counter "enters already moving" and
      // decelerates like the 12%/frame doctrine, never linear.
      const eased = 1 - Math.pow(1 - p, 3)
      const v = Math.round(eased * 100)
      if (v !== lastPct) {
        lastPct = v
        setPct(v)
      }
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Count complete → curtain snatch. sessionStorage is written NOW
        // so a fast refresh or an in-session back-navigation never replays.
        try {
          sessionStorage.setItem('lut-booted', '1')
        } catch {
          /* private mode — the page still works, boot may replay */
        }
        timerRef.current = window.setTimeout(() => setPhase('split'), 140)
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [phase])

  /* The overlay for `count` is rendered in THIS commit — only now is the
     CSS ::after redundant. Removing a class is external-system sync
     (no setState → no cascading renders). */
  useEffect(() => {
    if (phase === 'count' || phase === 'split') {
      document.documentElement.classList.remove('lux-boot-pending')
    }
  }, [phase])

  // Split finished → unmount the overlay entirely + hard-cleanup so the
  // session never replays the boot after an unmount.
  useEffect(() => {
    if (phase !== 'split') return
    const t = window.setTimeout(() => {
      setPhase('done')
      delete (window as Window).__LUX_BOOT__
    }, SPLIT_MS)
    return () => window.clearTimeout(t)
  }, [phase])

  // Unmount safety (dev strict-mode, error boundaries): mark the boot as
  // done so a remount never traps the user behind a veil.
  useEffect(
    () => () => {
      try {
        sessionStorage.setItem('lut-booted', '1')
      } catch {
        /* ignore */
      }
      document.documentElement.classList.remove('lux-boot-pending')
    },
    [],
  )

  if (phase === 'idle' || phase === 'done') return null

  const splitting = phase === 'split'

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-0 z-[200] pointer-events-none"
      // The whole overlay never fades — the HALVES do the leaving
      // ("leaves on an accelerating move", showreel doctrine).
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
    >
      {/* Curtain halves — top lifts, bottom drops, both ACCELERATE out. */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 bg-[#0b0a08] will-change-transform"
        style={{
          transform: splitting ? 'translateY(-101%)' : 'translateY(0)',
          transition: splitting
            ? `transform ${SPLIT_MS}ms cubic-bezier(0.7, 0, 0.84, 0)`
            : 'none',
        }}
      >
        {/* faint gold hairline on the half's leading edge */}
        <div
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent"
          style={{
            opacity: splitting ? 1 : 0,
            transition: 'opacity 160ms ease-out',
          }}
        />
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-[#0b0a08] will-change-transform"
        style={{
          transform: splitting ? 'translateY(101%)' : 'translateY(0)',
          transition: splitting
            ? `transform ${SPLIT_MS}ms cubic-bezier(0.7, 0, 0.84, 0)`
            : 'none',
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent"
          style={{
            opacity: splitting ? 1 : 0,
            transition: 'opacity 160ms ease-out',
          }}
        />
      </div>

      {/* Center stage — dot ignition + wordmark + counter.
          Scales DOWN slightly and de-blurs while counting (the "camera
          pulls back"), then is gone exactly when the halves part. */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-5"
        style={{
          opacity: splitting ? 0 : 1,
          transform: splitting ? 'scale(0.94)' : 'scale(1)',
          transition: 'opacity 260ms ease-out, transform 260ms ease-out',
        }}
      >
        {/* The single gold dot (dale-vaz) that blooms into a hairline seam */}
        <div className="relative flex h-10 w-40 items-center justify-center">
          <div
            className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_18px_rgba(201,162,75,0.85)]"
            style={{
              transform: `translate(-50%, -50%) scale(${1 + (pct / 100) * 0.35})`,
            }}
          />
          {/* progress seam grows from the dot outward, reading-direction
              aware (both sides grow symmetrically here — a lux seal) */}
          <div
            className="absolute top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-gold/0 via-gold/70 to-gold/70"
            style={{
              right: '50%',
              width: `${(pct / 100) * 44}px`,
              opacity: pct > 3 ? 1 : 0,
            }}
          />
          <div
            className="absolute top-1/2 h-px -translate-y-1/2 bg-gradient-to-l from-gold/0 via-gold/70 to-gold/70"
            style={{
              left: '50%',
              width: `${(pct / 100) * 44}px`,
              opacity: pct > 3 ? 1 : 0,
            }}
          />
        </div>

        {/* Wordmark + counter row */}
        <div className="flex items-baseline gap-3">
          <span className="font-display-en text-sm tracking-[0.42em] text-paper/85">
            LAST&nbsp;UNIQUE&nbsp;TOUCH
          </span>
          <span
            dir="ltr"
            className="font-display-en text-xs tabular-nums tracking-[0.2em] text-gold"
          >
            {String(pct).padStart(3, '0')}
          </span>
        </div>

        <span className="font-display text-[0.6875rem] tracking-[0.3em] text-paper/40">
          الميزون يستعد لاستقبالك
        </span>
      </div>
    </motion.div>
  )
}
