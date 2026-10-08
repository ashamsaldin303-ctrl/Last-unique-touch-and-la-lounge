'use client'

/**
 * CursorGlow — a soft golden aura that trails the pointer (desktop, fine
 * pointers only). Rendered as a single fixed layer above the page (z-[70],
 * pointer-events-none, soft-light blend) and moved with a lerped rAF loop
 * so it feels like light following the hand, not a sticker.
 *
 * Gates: pointer:fine · no prefers-reduced-motion · rAF loop starts only
 * after the first real pointer move (zero cost until then).
 */

import { useEffect, useRef } from 'react'

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const fine = window.matchMedia('(pointer: fine)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!fine.matches || reduced.matches) return

    let targetX = 0
    let targetY = 0
    let x = 0
    let y = 0
    let rafId = 0
    let running = false
    // v45: snap to the first pointer position so the aura doesn't visibly
    // fly in from the top-left corner before the lerp catches up.
    let hasMoved = false

    const loop = () => {
      // Lerp factor keeps the aura trailing behind the pointer.
      x += (targetX - x) * 0.085
      y += (targetY - y) * 0.085
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      // Sleep the loop once the aura has caught up (idle = zero cost).
      if (Math.abs(targetX - x) > 0.5 || Math.abs(targetY - y) > 0.5) {
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
      }
      targetX = e.clientX
      targetY = e.clientY
      el.classList.add('cursor-glow-active')
      wake()
    }

    const onPointerLeave = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      // relatedTarget is null only when the pointer leaves the window.
      if (!e.relatedTarget) {
        el.classList.remove('cursor-glow-active')
      }
    }

    const onVisibility = () => {
      if (document.hidden) el.classList.remove('cursor-glow-active')
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <div ref={ref} className="cursor-glow" aria-hidden="true" />
}
