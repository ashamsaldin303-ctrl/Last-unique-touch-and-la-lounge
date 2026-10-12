'use client'

/**
 * VelocityMarquee (Task 43, prompt-motion round 2).
 *
 * Source patterns:
 *  - wani-shola showreel rules: "a rhythm that **speeds up and slows
 *    down with the story**" — the ribbon is ALIVE: it accelerates with
 *    the reader's scroll, decelerates when they rest, and leans into
 *    the direction of travel.
 *  - official showreel: "blur follows speed" → we translate speed into
 *    a subtle SKEW (±3.4°) instead of blur (blur on a full-bleed strip
 *    is expensive); same perception, cheaper medium.
 *  - twoclipping: "no dead time" → it never fully stops; hovering only
 *    slows it to a courteous drift (the eye can inspect a pair).
 *
 * Engine: one rAF loop writing a single transform — no React re-renders,
 * no state. Seamless loop by wrapping x modulo the half-track width.
 * Off-screen loops sleep via IntersectionObserver (battery-friendly).
 * Direction follows the reading direction (RTL = base drift to the
 * right, matching the previous CSS keyframes exactly).
 *
 * Reduced motion → the track is rendered statically (no loop), which
 * matches the previous `animation: none` fallback.
 */

import { useEffect, useRef, type ReactNode } from 'react'

export function VelocityMarquee({
  children,
  className,
  baseSpeed = 46, // px/s at rest — measured close to the old 30s CSS loop
}: {
  children: ReactNode
  className?: string
  baseSpeed?: number
}) {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) return

    let raf = 0
    let running = false
    let visible = true
    let hovering = false
    let x = 0
    let vel = 0 // smoothed scroll velocity (px/frame → normalized)
    let lastScroll = window.scrollY
    let last = performance.now()
    let skew = 0

    const dir = getComputedStyle(track).direction === 'rtl' ? 1 : -1
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      // Scroll velocity, low-pass filtered (a spring would ring here —
      // we want the *illusion* of mass, not oscillation).
      const sy = window.scrollY
      const raw = (sy - lastScroll) / Math.max(dt * 60, 1) // px per frame @60
      lastScroll = sy
      vel += (raw - vel) * 0.11

      // Speed = base drift (+ hover courtesy slow-down) + scroll energy.
      // Down-scroll adds velocity, up-scroll subtracts — a strong upward
      // flick can gracefully reverse the drift (the classic velocity
      // marquee read: the ribbon follows the reader's momentum).
      const hoverFactor = hovering ? 0.16 : 1
      const dx = (baseSpeed * dir * hoverFactor + vel * 4.2) * dt
      x += dx

      // Lean into the direction of travel (the skew IS the blur).
      const targetSkew = Math.max(-3.4, Math.min(3.4, vel * 0.06))
      skew += (targetSkew - skew) * 0.12

      // Seamless wrap on the half-track (two identical halves).
      const half = track.scrollWidth / 2
      if (half > 0) {
        x = x - Math.floor(x / half) * half
      }
      track.style.transform = `translate3d(${x}px, 0, 0) skewY(${skew.toFixed(3)}deg)`

      raf = requestAnimationFrame(loop)
    }

    const wake = () => {
      if (!running) {
        running = true
        last = performance.now()
        raf = requestAnimationFrame(loop)
      }
    }
    const sleep = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true
        if (visible && !reduced.matches) wake()
        else if (!visible && running) sleep()
      },
      { rootMargin: '80px' },
    )
    io.observe(track)

    const onEnter = () => {
      hovering = true
    }
    const onLeave = () => {
      hovering = false
    }
    track.addEventListener('pointerenter', onEnter, { passive: true })
    track.addEventListener('pointerleave', onLeave, { passive: true })

    // While the tab is hidden rAF stops firing anyway; explicit stop
    // keeps `last` from going stale on resume.
    const onVisibility = () => {
      if (document.hidden && running) sleep()
      else if (!document.hidden && visible) wake()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      track.removeEventListener('pointerenter', onEnter)
      track.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      track.style.transform = ''
    }
  }, [baseSpeed])

  return (
    <div className={className} aria-hidden="true">
      <div ref={trackRef} className="flex w-max will-change-transform">
        {children}
      </div>
    </div>
  )
}
