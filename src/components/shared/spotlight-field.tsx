'use client'

/**
 * SpotlightField (Task 39, GetLayers study) — one delegated
 * pointermove listener that writes --spot-x / --spot-y (px) on every
 * `[data-spotlight]` element under the cursor. Cards opt in with the
 * attribute plus the `.spotlight-surface` class; the CSS renders the
 * brand-tinted radial highlight + hairline ring (both hover-gated).
 *
 * Why delegated: per-card pointer handlers cost one listener per card
 * and re-bind on every route swap. One document-level listener works
 * across the whole SPA for free. Values are written directly to
 * style — no React state, no re-renders.
 *
 * Gates: pointer:fine · hover-capable devices only (the CSS hides the
 * effect on (hover: none) anyway, so this is a pure cost optimization).
 */

import { useEffect } from 'react'

const SELECTOR = '[data-spotlight]'

export function SpotlightField() {
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)')
    const hoverable = window.matchMedia('(hover: hover)')
    if (!fine.matches || !hoverable.matches) return

    let current: HTMLElement | null = null

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const target = e.target as Element | null
      const card =
        target instanceof Element && typeof target.closest === 'function'
          ? target.closest<HTMLElement>(SELECTOR)
          : null

      if (current && current !== card) {
        // Left the previous card — reset so the next hover starts centered
        // instead of teleporting the light from the old position.
        current.style.removeProperty('--spot-x')
        current.style.removeProperty('--spot-y')
      }
      current = card
      if (!card) return

      const rect = card.getBoundingClientRect()
      card.style.setProperty('--spot-x', `${e.clientX - rect.left}px`)
      card.style.setProperty('--spot-y', `${e.clientY - rect.top}px`)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      if (current) {
        current.style.removeProperty('--spot-x')
        current.style.removeProperty('--spot-y')
      }
    }
  }, [])

  return null
}
