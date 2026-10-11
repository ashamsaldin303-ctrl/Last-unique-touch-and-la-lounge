'use client'

/**
 * BloomZoom (Task 43, prompt-motion round 2) — THE signature transition.
 *
 * Source pattern — antonio-kodheli's promo for prompt-motion itself:
 *   "that tile **blooms into its entry page**"
 *   "Tile corner radius **goes to 0 as a tile reaches full-bleed**"
 *   "One continuous camera over a single surface."
 *
 * When a product card is clicked, its image EXPANDS from its exact
 * viewport rect to a full-bleed cover (radius collapsing to 0 on the
 * way) while the SPA navigates underneath. The overlay then dissolves
 * into the already-arriving detail page: the eye never leaves the
 * product. Never a cut, never a fade to black — "every shot is made
 * out of the previous one" (official showreel doctrine).
 *
 * Safety gates:
 *  - prefers-reduced-motion → bloom() reports false; the caller lets
 *    plain anchor navigation happen.
 *  - Modified clicks (⌘/Ctrl/Shift) are the caller's to respect — the
 *    card skips the bloom so native new-tab behavior is preserved.
 *  - The overlay is a plain <img> (already-cached URL) — no layout
 *    thrash, no next/image machinery for a 0.6s ghost.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { motion } from 'framer-motion'
import { easeExpoOut } from '@/lib/motion'

export type BloomPayload = {
  /** Viewport-space rect of the clicked tile image. */
  rect: DOMRect
  /** Same URL the card rendered (browser cache → instant paint). */
  src: string
  /** Starting corner radius in px (read from the tile). */
  radius?: number
}

type BloomApi = {
  /** Returns false when the bloom cannot play (reduced motion) — the
   *  caller should then fall back to default anchor navigation. */
  bloom: (payload: BloomPayload) => boolean
}

const BloomCtx = createContext<BloomApi | null>(null)

export function useBloom(): BloomApi | null {
  return useContext(BloomCtx)
}

const EXPAND_MS = 560
const HOLD_MS = 120
const FADE_MS = 380

export function BloomProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<BloomPayload | null>(null)
  const [phase, setPhase] = useState<'expand' | 'fade' | null>(null)
  const timers = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const bloom = useCallback(
    (p: BloomPayload) => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced || p.rect.width < 8) return false
      clearTimers()
      setPayload(p)
      setPhase('expand')
      return true
    },
    [clearTimers],
  )

  // Phase machine: expand → (hold) → fade → unmount. All CSS/fre-
  // animates; the only job of the timers is to advance the phase.
  useEffect(() => {
    if (phase !== 'expand' || !payload) return
    const t = window.setTimeout(() => setPhase('fade'), EXPAND_MS + HOLD_MS)
    return () => window.clearTimeout(t)
  }, [phase, payload])

  useEffect(() => {
    if (phase !== 'fade') return
    const t = window.setTimeout(() => {
      setPhase(null)
      setPayload(null)
    }, FADE_MS)
    return () => window.clearTimeout(t)
  }, [phase])

  const fading = phase === 'fade'

  return (
    <BloomCtx.Provider value={{ bloom }}>
      {children}

      {payload && phase && (
        <div
          className="pointer-events-none fixed inset-0 z-[150]"
          aria-hidden="true"
        >
          {/* Backdrop — ink floods in fast ("no dead time"), breathes out
              with the fade. Plain CSS transitions: one element, cheap. */}
          <div
            className="absolute inset-0 bg-[#0b0a08]"
            style={{
              opacity: fading ? 0 : 1,
              transition: `opacity ${fading ? FADE_MS : 300}ms ${
                fading ? 'ease-out' : 'cubic-bezier(0.16, 1, 0.3, 1)'
              }`,
            }}
          />

          {/* The blooming image — rect → full-bleed, radius → 0.
              ultimaxbt: "When a shape fills the screen, scale it past
              all four corners" → the final size OVERSHOOTS the viewport
              by ~1.5% so the fill never shows an edge during the fade. */}
          <motion.div
            className="absolute overflow-hidden"
            initial={{
              left: payload.rect.left,
              top: payload.rect.top,
              width: payload.rect.width,
              height: payload.rect.height,
              borderRadius: payload.radius ?? 8,
            }}
            animate={{
              left: '-0.75vw',
              top: '-0.75vh',
              width: '101.5vw',
              height: '102vh',
              borderRadius: 0,
            }}
            transition={{ duration: EXPAND_MS / 1000, ease: easeExpoOut }}
            style={{
              opacity: fading ? 0 : 1,
              transitionProperty: 'opacity',
              transitionDuration: `${FADE_MS}ms`,
              transitionTimingFunction: 'ease-out',
            }}
          >
            <img
              src={payload.src}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
            {/* Couture veil so the arriving detail page glows through
                the fade instead of a hard photographic cut. */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a08]/10 via-transparent to-[#0b0a08]/55" />
          </motion.div>
        </div>
      )}
    </BloomCtx.Provider>
  )
}
