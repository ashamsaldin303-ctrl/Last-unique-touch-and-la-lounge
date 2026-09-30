'use client'

/**
 * Sets data-brand + lang + dir on <html> whenever the route/locale changes,
 * plus scroll-to-top on navigation. Mirrors the original repo's
 * BrandThemeSetter (src/components/providers/brand-theme-setter.tsx).
 */

import { useEffect } from 'react'
import { useRouter } from '@/lib/router'
import { resolveBrandFromPath } from '@/lib/brand'
import { useTheme } from 'next-themes'

export function BrandThemeSetter() {
  const { path, locale } = useRouter()
  const { setTheme, resolvedTheme } = useTheme() as {
    setTheme: (theme: string) => void
    resolvedTheme: string | undefined
  }

  useEffect(() => {
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

  // La Lounge + Birthday brand pages are best experienced in their
  // canonical light/dark identity — but we never override an explicit
  // user choice, so only align on first mount.
  useEffect(() => {
    // no-op: theme remains user-controlled via navbar toggle
    void resolvedTheme
    void setTheme
  }, [resolvedTheme, setTheme])

  return null
}
