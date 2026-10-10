'use client'

/**
 * InkFloodLink — the scene transition from the Apple-keynote showreel
 * prompt (twoclipping-221cab):
 *
 *   "A black shape floods the whole frame and contracts into the next
 *    scene." — and "a label rises inside it".
 *
 * Clicking floods the viewport with the brand ink (a circle clip that
 * grows from the exact click point — an iris, not a rectangle), the
 * world's name rises inside the flood while the SPA swaps the view
 * beneath it, then the ink contracts away to reveal the new scene.
 * Total choreography ≈ 1.15s; every phase is occupied (no dead time).
 *
 * Safety: modifier/middle clicks fall through to the browser (new tab),
 * reduced-motion skips straight to navigation, a same-hash click still
 * clears the overlay, and unmount cancels every pending timer.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { springSoft, springGentle } from '@/lib/motion'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'

/* Timeline (ms) — expand → navigate → label hold → contract → cleanup */
const T_NAVIGATE = 280
const T_CONTRACT = 700
const T_CLEANUP = 1150

interface FloodState {
  x: number
  y: number
  radius: number
  /** Label rising inside the ink (the world/brand name). */
  label: string
  /** Flip to true to contract the ink away (second phase). */
  contract?: boolean
}

export interface InkFloodLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Hash-router PATH (e.g. '/la-lounge'). Navigation itself goes
   *  through router.navigate() at click time — the locale is baked at
   *  the moment of the click, never during render, so SSR markup stays
   *  hydration-stable (mirrors the navbar's onClick+navigate pattern;
   *  the router resolves the stored locale during hydration while
   *  I18n still renders the default — baking href() into the DOM here
   *  would mismatch). */
  path: string
  /** Ink color — any CSS color (var(--tri), hex…). */
  accent: string
  /** Name that rises inside the flood. */
  label: string
  /** Color of the rising label (dark ink on light floods). */
  labelColor?: string
  children: React.ReactNode
}

export function InkFloodLink({
  path,
  accent,
  label,
  labelColor = 'rgba(255,255,255,0.96)',
  children,
  onClick,
  ...anchorProps
}: InkFloodLinkProps) {
  const reduceMotion = useReducedMotion()
  const { locale } = useI18n()
  const { navigate } = useRouter()
  const [flood, setFlood] = useState<FloodState | null>(null)
  const timers = useRef<number[]>([])
  const busy = useRef(false)

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e)
      // Let the browser own modified clicks (new tab / window).
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
        return
      e.preventDefault()
      // Reduced motion: navigate immediately, no theatre.
      if (reduceMotion) {
        navigate(path)
        return
      }
      if (busy.current) return
      busy.current = true

      const x = e.clientX
      const y = e.clientY
      // Radius covering the farthest viewport corner from the click.
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )

      setFlood({ x, y, radius, label })
      clearTimers()
      timers.current.push(
        window.setTimeout(() => {
          // Navigate beneath the ink — router.navigate pushes history,
          // swaps the view and emits lut:navigate (a11y) like every
          // other nav element on the site.
          navigate(path)
        }, T_NAVIGATE),
        window.setTimeout(() => setFlood((f) => (f ? { ...f, contract: true } : f)), T_CONTRACT),
        window.setTimeout(() => {
          setFlood(null)
          busy.current = false
        }, T_CLEANUP)
      )
    },
    [path, label, onClick, reduceMotion, clearTimers, navigate]
  )

  /* The rendered href is built from the I18N locale — the language the
     label text is actually displayed in. SSR (default locale) matches
     the first client render; the post-mount locale restore re-renders
     it as a normal DOM update. */
  const renderedHref = `#/${locale}${path === '/' ? '' : path}`

  return (
    <>
      <a {...anchorProps} href={renderedHref} onClick={handleClick}>
        {children}
      </a>
      {flood
        ? createPortal(
            <InkFloodOverlay flood={flood} accent={accent} labelColor={labelColor} />,
            document.body
          )
        : null}
    </>
  )
}

/* ------------------------------------------------------------------ */

function InkFloodOverlay({
  flood,
  accent,
  labelColor,
}: {
  flood: FloodState
  accent: string
  labelColor: string
}) {
  const expanding = !flood.contract
  const circle = (r: number) =>
    `circle(${r}px at ${flood.x}px ${flood.y}px)`

  return (
    <motion.div
      data-ink-flood
      aria-hidden="true"
      className="fixed inset-0 z-[95] pointer-events-none flex items-center justify-center"
      style={{ background: accent, clipPath: circle(0) }}
      initial={{ clipPath: circle(0) }}
      animate={{
        clipPath: expanding
          ? circle(flood.radius)
          : // Contract to a point slightly above the entry point —
            // reads as the ink exiting the way it came.
            circle(0),
      }}
      transition={expanding ? springSoft : springGentle}
    >
      {/* The label that rises inside the flood (twoclipping: "a label
          rises inside it"). Paper-white display type, spring settle. */}
      <motion.span
        className="font-display text-2xl sm:text-4xl font-bold tracking-wide select-none"
        style={{ color: labelColor, textShadow: '0 2px 30px rgba(0,0,0,0.25)' }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: flood.contract ? 0 : 1, y: flood.contract ? -12 : 0 }}
        transition={springSoft}
        dir="auto"
      >
        {flood.label}
      </motion.span>
    </motion.div>
  )
}
