'use client'

/**
 * CursorGlow — the full "maison cursor" (Task 39, GetLayers study).
 *
 * Three layers, one lerped rAF loop:
 *  1. A soft golden aura (soft-light blend) trailing the pointer —
 *     light following the hand (unchanged from the original).
 *  2. A crisp brand-tinted dot tracking the pointer 1:1.
 *  3. A trailing ring that swells over interactive elements
 *     (a, button, [role=button], input/textarea/select) and
 *     collapses into a caret-guide over text fields.
 *
 * Gates: pointer:fine · no prefers-reduced-motion · the loop starts
 * only after the first real pointer move (zero cost until then) and
 * sleeps once the layers catch up. Spotlight-style cards keep their
 * own hover state — this component never hides the native cursor.
 */

import { useEffect, useRef } from 'react'

export function CursorGlow() {
  const auraRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const aura = auraRef.current
    const dot = dotRef.current
    const ring = ringRef.current
    if (!aura || !dot || !ring) return

    const fine = window.matchMedia('(pointer: fine)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!fine.matches || reduced.matches) return

    let targetX = 0
    let targetY = 0
    let x = 0
    let y = 0
    // The ring trails further behind than the aura for depth.
    let ringX = 0
    let ringY = 0
    let rafId = 0
    let running = false
    // v45: snap to the first pointer position so the layers don't visibly
    // fly in from the top-left corner before the lerp catches up.
    let hasMoved = false

    const loop = () => {
      // Aura lerp — light following the hand.
      x += (targetX - x) * 0.085
      y += (targetY - y) * 0.085
      aura.style.transform = `translate3d(${x}px, ${y}px, 0)`
      // Dot tracks 1:1 (transform only — cheap).
      dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`
      // Ring lags behind — reads as physical inertia.
      ringX += (targetX - ringX) * 0.22
      ringY += (targetY - ringY) * 0.22
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`
      // Sleep the loop once everything has caught up (idle = zero cost).
      const auraGap = Math.abs(targetX - x) > 0.5 || Math.abs(targetY - y) > 0.5
      const ringGap = Math.abs(targetX - ringX) > 0.5 || Math.abs(targetY - ringY) > 0.5
      if (auraGap || ringGap) {
        rafId = requestAnimationFrame(loop)
      } else {
        running = false
      }
    }

    const wake = () => {
      if (!running) {
        running = true
        rafId = requestAnimationFrame(loop)
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (!hasMoved) {
        hasMoved = true
        x = e.clientX
        y = e.clientY
        ringX = e.clientX
        ringY = e.clientY
        document.documentElement.classList.add('lux-cursor-active')
      }
      targetX = e.clientX
      targetY = e.clientY
      aura.classList.add('cursor-glow-active')
      wake()
    }

    /** Ring hover state — swells over interactives, caret over text. */
    const updateRingState = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const el = e.target as Element | null
      if (!el || !(el instanceof Element) || typeof el.closest !== 'function') return
      const interactive = el.closest<HTMLElement>(
        'a, button, [role="button"], [role="tab"], summary, label, input[type="checkbox"], input[type="radio"]',
      )
      const textual = el.closest<HTMLElement>(
        'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select, [contenteditable="true"]',
      )
      if (textual) {
        ring.classList.add('lux-cursor-text')
        ring.classList.remove('lux-cursor-hover')
      } else if (interactive) {
        ring.classList.add('lux-cursor-hover')
        ring.classList.remove('lux-cursor-text')
      } else {
        ring.classList.remove('lux-cursor-hover')
        ring.classList.remove('lux-cursor-text')
      }
    }

    // Delegated (bubble) listener — one subscription covers every view.
    document.addEventListener('pointermove', updateRingState, { passive: true })

    const onPointerLeave = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      // relatedTarget is null only when the pointer leaves the window.
      if (!e.relatedTarget) {
        aura.classList.remove('cursor-glow-active')
        document.documentElement.classList.remove('lux-cursor-active')
      }
    }

    const onVisibility = () => {
      if (document.hidden) {
        aura.classList.remove('cursor-glow-active')
        document.documentElement.classList.remove('lux-cursor-active')
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointermove', updateRingState)
      document.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      document.documentElement.classList.remove('lux-cursor-active')
    }
  }, [])

  return (
    <>
      <div ref={auraRef} className="cursor-glow" aria-hidden="true" />
      <div ref={dotRef} className="lux-cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="lux-cursor-ring" aria-hidden="true" />
    </>
  )
}
