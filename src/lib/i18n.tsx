'use client'

/**
 * Lightweight i18n — same nested message keys as the original repo's
 * next-intl usage (messages/ar.json + messages/en.json), minus middleware.
 * t('laLounge.services.customFurniture.title') resolves identically.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import arMessages from '@/messages/ar.json'
import enMessages from '@/messages/en.json'

export type Locale = 'ar' | 'en'

const MESSAGES: Record<Locale, Record<string, unknown>> = {
  ar: arMessages as unknown as Record<string, unknown>,
  en: enMessages as unknown as Record<string, unknown>,
}

const LOCALE_KEY = 'lut_locale'

export const DEFAULT_LOCALE: Locale = 'ar'

interface I18nContextValue {
  locale: Locale
  dir: 'rtl' | 'ltr'
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function resolveKey(obj: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

/** ICU-like {count, plural, ...} fallback for simple {name} params. */
function formatMessage(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  // Handle plural blocks: {count, plural, =0 {...} =1 {...} other {...}}
  let result = template.replace(
    /\{(\w+),\s*plural,\s*((?:[^{}]|\{[^{}]*\})*)\}/g,
    (_match, varName: string, body: string) => {
      const count = Number(params[varName] ?? 0)
      const clauses = body.match(/=(\w+)\s*\{([^}]*)\}|(\w+)\s*\{([^}]*)\}/g) ?? []
      let fallback = ''
      for (const clause of clauses) {
        const m = clause.match(/^=(\w+)\s*\{([^}]*)\}$/)
        if (m) {
          if (m[1] === String(count)) return m[2].replace(/#/g, String(count))
          continue
        }
        const f = clause.match(/^(\w+)\s*\{([^}]*)\}$/)
        if (f && (f[1] === 'other' || f[1] === 'few' || f[1] === 'many')) fallback = f[2].replace(/#/g, String(count))
      }
      return fallback
    }
  )
  // Simple {param} substitution
  result = result.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
  return result
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  // Restore persisted locale on mount (external state → sync is required)
  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === 'ar' || stored === 'en') setLocaleState(stored)
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    window.localStorage.setItem(LOCALE_KEY, next)
  }, [])

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar'
      window.localStorage.setItem(LOCALE_KEY, next)
      return next
    })
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const value = resolveKey(MESSAGES[locale], key) ?? resolveKey(MESSAGES.en, key)
      if (typeof value === 'string') return formatMessage(value, params)
      if (Array.isArray(value)) return JSON.stringify(value)
      return key
    },
    [locale]
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir: locale === 'ar' ? 'rtl' : 'ltr',
      setLocale,
      toggleLocale,
      t,
    }),
    [locale, setLocale, toggleLocale, t]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}

/** Typed plural helper for the products resultCount key. */
export function useResultCount() {
  const { t, locale } = useI18n()
  return useCallback(
    (count: number) => {
      if (locale === 'ar') {
        if (count === 0) return 'لا توجد منتجات'
        if (count === 1) return 'منتج واحد'
        if (count === 2) return 'منتجان'
        if (count >= 3 && count <= 10) return `${count} منتجات`
        return `${count} منتجاً`
      }
      return t('products.resultCount', { count })
    },
    [t, locale]
  )
}
