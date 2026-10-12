'use client'

/**
 * HorizontalPin (Task 43, prompt-motion round 2).
 *
 * Source pattern — ercankeskinx "Five scroll-based sections":
 *   "Build 5 completely different scroll-based sections, decide the
 *    context & layout yourself."
 * A sticky viewport pins while the track slides horizontally under the
 * reader's vertical scroll — the scroll-driven storytelling signature.
 *
 * Choreography rules (house doctrine):
 *  - The track's x is SPRING-SMOOTHED (springGentle-ish) — mass following
 *    the wheel, never a linear mapping.
 *  - Reading-direction aware: RTL slides the track toward the start
 *    (positive x), LTR toward the negative — the panels always arrive
 *    from the inline-end, exactly like text lines do.
 *  - Panels activate as they reach center: scale + opacity + a gold
 *    frame ignite (class toggle, zero re-renders).
 *  - A progress rail with ≥44px touch-target dots lets the reader JUMP
 *    between panels (scroll-position math, not state).
 *
 * Mobile: the consumer renders its own vertical layout — this component
 * is `hidden md:block` by default and measures nothing on phones.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

export function HorizontalPin({
  children,
  panelCount,
  className,
  trackClassName,
  label,
}: {
  children: ReactNode
  panelCount: number
  className?: string
  trackClassName?: string
  /** Accessible label for the jump rail. */
  label?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 110, damping: 30, mass: 0.6 })

  useEffect(() => {
    const wrap = wrapRef.current
    const track = trackRef.current
    const rail = railRef.current
    if (!wrap || !track || !rail) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const isRTL = getComputedStyle(track).direction === 'rtl'

    let range = 0
    let wrapTop = 0
    let wrapH = 0

    const measure = () => {
      // Horizontal distance the track must travel.
      range = Math.max(0, track.scrollWidth - window.innerWidth + 1)
      // Scroll distance reserved for the pan: 1px of pan per 1px of
      // scroll feels direct; add a beat of head/tail so the first and
      // last panels get a held moment at the extremes.
      wrapH = window.innerHeight + range
      wrap.style.height = `${wrapH}px`
      const r = wrap.getBoundingClientRect()
      wrapTop = r.top + window.scrollY
      // Sync rail dots with the active panel.
      syncRail(unwrap(x.get()))
    }

    const unwrap = (v: number) => (range > 0 ? Math.min(1, Math.max(0, v / (isRTL ? range : -range))) : 0)

    const syncRail = (p: number) => {
      const active = Math.round(p * (panelCount - 1))
      const dots = rail.querySelectorAll<HTMLElement>('[data-pin-dot]')
      dots.forEach((d, i) => {
        const on = i === active
        d.dataset.active = on ? 'true' : 'false'
        const visual = d.firstElementChild as HTMLElement | null
        if (visual) {
          visual.style.transform = on ? 'scale(1)' : 'scale(0.45)'
          visual.style.opacity = on ? '1' : '0.55'
        }
      })
      const panels = track.querySelectorAll<HTMLElement>('[data-pin-panel]')
      panels.forEach((el, i) => {
        const on = i === active
        el.dataset.active = on ? 'true' : 'false'
      })
      const fill = rail.querySelector<HTMLElement>('[data-pin-fill]')
      if (fill) {
        const pct = panelCount > 1 ? (active / (panelCount - 1)) * 100 : 0
        fill.style.width = `${pct}%`
      }
      const counter = rail.querySelector<HTMLElement>('[data-pin-counter]')
      if (counter) counter.textContent = String(active + 1).padStart(2, '0')
    }

    const onScroll = () => {
      if (reduced.matches) {
        // Reduced motion: snap to nearest panel center without motion.
        const rel = window.scrollY - wrapTop
        const p = range > 0 ? Math.min(1, Math.max(0, rel / range)) : 0
        x.set(isRTL ? p * range : -p * range)
        syncRail(p)
        return
      }
      const rel = window.scrollY - wrapTop
      const p = range > 0 ? Math.min(1, Math.max(0, rel / range)) : 0
      // Enter already moving: the spring does the smoothing.
      x.set(isRTL ? p * range : -p * range)
      syncRail(p)
    }

    const onResize = () => {
      measure()
      onScroll()
    }

    const onDotClick = (e: Event) => {
      const btn = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-pin-dot]')
      if (!btn) return
      const idx = Number(btn.dataset.pinDot)
      const target = wrapTop + (idx / Math.max(1, panelCount - 1)) * range
      window.scrollTo({ top: target, behavior: reduced.matches ? 'auto' : 'smooth' })
    }

    measure()
    onScroll()
    const ro = new ResizeObserver(onResize)
    ro.observe(track)
    window.addEventListener('scroll', onScroll, { passive: true })
    rail.addEventListener('click', onDotClick)

    // Apply the smoothed x to the track transform (one subscription,
    // imperative style writes — no re-renders).
    const unsub = sx.on('change', (v) => {
      track.style.transform = `translate3d(${v.toFixed(2)}px, 0, 0)`
    })
    track.style.transform = `translate3d(${sx.get()}px, 0, 0)`

    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', onScroll)
      rail.removeEventListener('click', onDotClick)
      unsub()
    }
  }, [panelCount, sx, x])

  return (
    <div
      ref={wrapRef}
      className={cn('relative hidden md:block', className)}
      style={{ height: `${panelCount * 100}vh` }}
    >
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div
          ref={trackRef}
          className={cn(
            'flex items-stretch gap-10 px-[9vw] will-change-transform',
            trackClassName,
          )}
          style={{ transform: 'translate3d(0,0,0)' }}
        >
          {children}
        </div>

        {/* Progress rail — jump dots (44px touch targets) + counter */}
        <div
          ref={railRef}
          role="group"
          aria-label={label}
          className="absolute inset-x-0 bottom-10 z-10 mx-auto flex w-fit items-center gap-3"
        >
          <span
            data-pin-counter
            className="font-display-en w-7 text-end text-xs tabular-nums tracking-[0.2em] text-gold"
          >
            01
          </span>
          <div className="relative h-px w-44 bg-line-soft">
            <div
              data-pin-fill
              className="absolute inset-y-0 start-0 bg-gradient-to-r from-gold-light via-gold to-gold-deep"
              style={{ width: '0%' }}
            />
          </div>
          <span className="font-display-en w-7 text-xs tabular-nums tracking-[0.2em] text-paper/40">
            {String(panelCount).padStart(2, '0')}
          </span>
          <div className="ms-4 flex items-center gap-1.5">
            {Array.from({ length: panelCount }, (_, i) => (
              <button
                key={i}
                type="button"
                data-pin-dot={i}
                data-active={i === 0 ? 'true' : 'false'}
                aria-label={`${label ?? ''} — ${i + 1}`}
                className="flex h-11 w-11 items-center justify-center"
              >
                <span
                  className="block h-2.5 w-2.5 rounded-full bg-gold transition-transform duration-300"
                  style={{
                    transform: i === 0 ? 'scale(1)' : 'scale(0.45)',
                    opacity: i === 0 ? 1 : 0.55,
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
