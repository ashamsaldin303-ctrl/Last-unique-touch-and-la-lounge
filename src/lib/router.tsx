'use client'

/**
 * Hash-based multi-page router.
 *
 * Reproduces the ORIGINAL repo's page structure exactly
 * (src/app/[locale]/...) inside the single visible Next.js route:
 *
 *   #/ar                          → home (brand selector)
 *   #/ar/last-unique-touch        → LUT brand page
 *   #/ar/la-lounge                → La Lounge brand page
 *   #/ar/la-lounge/custom-furniture | event-planning | ready-plans
 *   #/ar/your-birthday            → Your Birthday brand page
 *   #/ar/products  #/ar/products/[slug]
 *   #/ar/cart  #/ar/checkout  #/ar/checkout/payment  #/ar/checkout/success
 *   #/ar/about  #/ar/contact  #/ar/privacy  #/ar/terms  #/ar/refund
 *   (same for /en)
 *
 * Browser back/forward + deep links work via hashchange/popstate.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_LOCALE, type Locale, useI18n } from '@/lib/i18n'

export interface RouteState {
  locale: Locale
  /** Locale-stripped path, always starts with '/' */
  path: string
}

const LOCALES: Locale[] = ['ar', 'en']

function parseHash(hash: string): RouteState {
  // hash like "#/ar/products/louis-ghost-chair" or "#/en"
  const raw = hash.replace(/^#/, '')
  if (!raw || raw === '/') return { locale: DEFAULT_LOCALE, path: '/' }
  const parts = raw.replace(/^\//, '').split('/')
  if (parts.length > 0 && LOCALES.includes(parts[0] as Locale)) {
    const locale = parts[0] as Locale
    const rest = parts.slice(1).join('/')
    return { locale, path: rest ? `/${rest}` : '/' }
  }
  return { locale: DEFAULT_LOCALE, path: `/${parts.join('/')}` }
}

interface RouterContextValue extends RouteState {
  navigate: (path: string, locale?: Locale) => void
  /** Build a full hash href for links */
  href: (path: string, locale?: Locale) => string
}

const RouterContext = createContext<RouterContextValue | null>(null)

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<RouteState>(() => {
    if (typeof window === 'undefined') return { locale: DEFAULT_LOCALE, path: '/' }
    return parseHash(window.location.hash)
  })
  const { setLocale: setI18nLocale } = useI18n()

  const applyRoute = useCallback((next: RouteState, push: boolean) => {
    const hash = `#/${next.locale}${next.path === '/' ? '' : next.path}`
    if (push && window.location.hash !== hash) {
      window.history.pushState(null, '', hash)
    }
    setRoute(next)
    window.dispatchEvent(new CustomEvent('lut:navigate', { detail: next }))
  }, [])

  // Sync initial hash → router (covers deep links — external URL state sync)
  useEffect(() => {
    const initial = parseHash(window.location.hash)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoute(initial)
    setI18nLocale(initial.locale)
  }, [])

  // hashchange (user edits URL / follows <a href="#/...">)
  useEffect(() => {
    const onHashChange = () => {
      const next = parseHash(window.location.hash)
      setRoute(next)
      setI18nLocale(next.locale)
      window.dispatchEvent(new CustomEvent('lut:navigate', { detail: next }))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [setI18nLocale])

  const navigate = useCallback(
    (path: string, locale?: Locale) => {
      const target: RouteState = {
        locale: locale ?? route.locale,
        path: path.startsWith('/') ? path : `/${path}`,
      }
      // Programmatic navigation → pushState so back button works
      applyRoute(target, true)
      if (locale && locale !== route.locale) setI18nLocale(locale)
    },
    [route.locale, applyRoute, setI18nLocale]
  )

  const href = useCallback(
    (path: string, locale?: Locale) => {
      const loc = locale ?? route.locale
      const p = path.startsWith('/') ? path : `/${path}`
      return `#/${loc}${p === '/' ? '' : p}`
    },
    [route.locale]
  )

  const value = useMemo<RouterContextValue>(
    () => ({ ...route, navigate, href }),
    [route, navigate, href]
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider')
  return ctx
}

/** Locale-aware navigate that keeps the current path (for language switching). */
export function useLocaleSwitch() {
  const { path, locale, navigate } = useRouter()
  return useCallback(() => {
    navigate(path, locale === 'ar' ? 'en' : 'ar')
  }, [path, locale, navigate])
}
