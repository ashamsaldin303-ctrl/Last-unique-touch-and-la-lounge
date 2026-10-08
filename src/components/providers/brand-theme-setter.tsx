'use client'

/**
 * Sets data-brand + lang + dir on <html> whenever the route/locale changes,
 * plus scroll-to-top on navigation. Mirrors the original repo's
 * BrandThemeSetter (src/components/providers/brand-theme-setter.tsx).
 */

import { useEffect, useLayoutEffect } from 'react'
import { useRouter } from '@/lib/router'
import { resolveBrandFromPath } from '@/lib/brand'

/* SSR-safe layout effect (same pattern as src/app/page.tsx): useEffect on
   the server, useLayoutEffect on the client — applies data-brand/lang/dir
   BEFORE the first paint so cross-brand hash navigation never renders one
   frame with the previous brand's palette. */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function BrandThemeSetter() {
  const { path, locale } = useRouter()

  useIsomorphicLayoutEffect(() => {
    const brand = resolveBrandFromPath(path)
    const html = document.documentElement
    html.dataset.brand = brand
    html.lang = locale
    html.dir = locale === 'ar' ? 'rtl' : 'ltr'
  }, [path, locale])

  // Scroll to top on every navigation
  useEffect(() => {
    const onNavigate = () => {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
    window.addEventListener('lut:navigate', onNavigate)
    return () => window.removeEventListener('lut:navigate', onNavigate)
  }, [])

  return null
}
