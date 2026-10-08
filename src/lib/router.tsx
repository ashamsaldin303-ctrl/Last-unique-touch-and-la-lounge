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
 * Browser back/forward + deep links work via hashchange: programmatic
 * navigation uses pushState (which never fires hashchange), while history
 * traversal between fragment-differing entries fires hashchange per the
 * HTML spec — so one listener covers both without double-emitting.
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

/** parseHash result — `locale: null` means the hash carries no locale AND
 *  no path (bare root), so the caller must resolve the locale through the
 *  preference chain instead of forcing the default. */
interface ParsedHash {
  locale: Locale | null
  path: string
}

/** Type guard — lets parseHash narrow without `as Locale` casts. */
function isLocale(value: string | undefined): value is Locale {
  return value === 'ar' || value === 'en'
}

function parseHash(hash: string): ParsedHash {
  // hash like "#/ar/products/louis-ghost-chair" or "#/en". Unknown/unicode
  // segments simply become path segments (rendered by the 404 page) — never
  // throws, never re-encoded. A bare/absent hash ("", "#", "#/") yields a
  // null locale: the stored preference decides (see resolveInitialLocale)
  // instead of unconditionally defaulting to Arabic, which used to wipe a
  // persisted English preference on every bare-root visit.
  const raw = hash.replace(/^#/, '')
  if (!raw || raw === '/') return { locale: null, path: '/' }
  const parts = raw.replace(/^\//, '').split('/')
  if (isLocale(parts[0])) {
    const rest = parts.slice(1).join('/')
    return { locale: parts[0], path: rest ? `/${rest}` : '/' }
  }
  // Legacy no-locale hash (e.g. "#/products") — keep the historical
  // catch-all behavior: default locale + the segments become the path.
  return { locale: DEFAULT_LOCALE, path: `/${parts.join('/')}` }
}

/** Persisted-locale key — mirrors i18n.tsx's LOCALE_KEY (not exported there;
 *  comment-linked like the [...slug] catch-all). */
const LOCALE_STORAGE_KEY = 'lut_locale'

/**
 * Initial-locale resolution chain: explicit hash locale > persisted
 * preference (localStorage) > browser language > Arabic default.
 * `parsed` is non-null when the hash itself carries the locale, which
 * always wins (an explicit deep link must never be overridden).
 */
function resolveInitialLocale(parsed: Locale | null): Locale {
  if (parsed) return parsed
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored === 'ar' || stored === 'en') return stored
  } catch {
    // localStorage unavailable (private mode) — fall through to sniffing.
  }
  const langs =
    typeof navigator !== 'undefined'
      ? (navigator.languages ?? [navigator.language])
      : []
  for (const lang of langs) {
    const code = (lang ?? '').toLowerCase()
    if (code.startsWith('ar')) return 'ar'
    if (code.startsWith('en')) return 'en'
  }
  return DEFAULT_LOCALE
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
    const parsed = parseHash(window.location.hash)
    return { locale: resolveInitialLocale(parsed.locale), path: parsed.path }
  })
  const { setLocale: setI18nLocale } = useI18n()

  const applyRoute = useCallback((next: RouteState, push: boolean) => {
    const hash = `#/${next.locale}${next.path === '/' ? '' : next.path}`
    // Dedupe: pushing an identical hash would create a redundant history
    // entry, and pushState never fires hashchange — so there is exactly one
    // emit per navigation, even under rapid consecutive clicks.
    if (push && window.location.hash !== hash) {
      window.history.pushState(null, '', hash)
    }
    setRoute(next)
    window.dispatchEvent(new CustomEvent('lut:navigate', { detail: next }))
  }, [])

  // Sync initial hash → router (covers deep links — external URL state sync).
  // A bare root resolves through the preference chain, and setI18nLocale
  // persists the resolved locale (a no-op write when it came from storage).
  useEffect(() => {
    const parsed = parseHash(window.location.hash)
    const initial: RouteState = {
      locale: resolveInitialLocale(parsed.locale),
      path: parsed.path,
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoute(initial)
    setI18nLocale(initial.locale)
  }, [])

  // hashchange (user edits URL / follows <a href="#/..."> / back-forward)
  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash(window.location.hash)
      // Hash cleared to bare root mid-session: keep the ACTIVE locale (the
      // stored preference is already this locale) — no silent language flip.
      const next: RouteState = { locale: parsed.locale ?? route.locale, path: parsed.path }
      setRoute(next)
      setI18nLocale(next.locale)
      window.dispatchEvent(new CustomEvent('lut:navigate', { detail: next }))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [setI18nLocale, route.locale])

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
