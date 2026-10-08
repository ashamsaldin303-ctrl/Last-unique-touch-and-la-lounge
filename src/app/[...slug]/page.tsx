'use client'

/**
 * Legacy-path catch-all — the router's safety net for every URL that is
 * NOT the SPA root (`/`), an API Route Handler (`/api/*`), or a static
 * asset. The whole site lives behind the hash router on ONE Next.js route
 * (`/#/ar/...` · `/#/en/...`), so any bare server path is translated into
 * its canonical hash route:
 *
 *   /admin                → /#/ar/admin (or the SPA-persisted locale)
 *   /ar/admin             → /#/ar/admin
 *   /en/products          → /#/en/products
 *   /products/red-carpet  → /#/ar/products/red-carpet
 *
 * Why this exists: the view components originally lived in `src/pages/`,
 * which made Next.js ALSO expose them as Pages Router server routes.
 * Rendering them there — outside I18nProvider — crashed with
 * "useI18n must be used inside I18nProvider" (a 500 on /admin). The
 * components now live in `src/views`, and this catch-all turns any old,
 * shared, or hand-typed URL into a working deep link.
 *
 * Route precedence keeps this safe: `/` (exact app route) and every
 * `/api/*` Route Handler (exact + dynamic segments) always beat a
 * catch-all, so the SPA and the API are untouched — only orphan paths
 * land here.
 */

import { useEffect } from 'react'

/** Same storage key as src/lib/i18n.tsx — the SPA's persisted locale. */
const LOCALE_KEY = 'lut_locale'

/**
 * Translate a bare server path into the SPA's hash-route form.
 *
 *   - A /ar/… or /en/… prefix wins (explicit locale in the URL).
 *   - Otherwise the SPA-persisted locale is honored.
 *   - Otherwise Arabic — the site's default locale.
 *
 * Query strings are dropped on purpose: the hash router parses only the
 * hash portion, and no page in this app reads query parameters.
 */
function buildHashTarget(pathname: string, storedLocale: string | null): string {
  let locale: 'ar' | 'en' = storedLocale === 'en' ? 'en' : 'ar'
  let path = pathname

  const prefixed = /^\/(ar|en)(\/|$)/.exec(pathname)
  if (prefixed) {
    locale = prefixed[1] as 'ar' | 'en'
    path = pathname.slice(3) || '/'
  }

  path = path.replace(/\/+$/, '') || '/'
  return `/#/${locale}${path === '/' ? '' : path}`
}

export default function LegacyPathRedirectPage() {
  useEffect(() => {
    const target = buildHashTarget(
      window.location.pathname,
      window.localStorage.getItem(LOCALE_KEY),
    )
    // replace() — the orphan path never enters history, so the browser
    // back button skips straight past it.
    window.location.replace(target)
  }, [])

  /* Branded bilingual hand-off shell. Inline styles only: it must look
     right even before/without any stylesheet resolving, and it renders
     inside the root layout (fonts + globals.css already apply). */
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.25rem',
        background: '#0e0d0b',
        color: '#f5efe4',
        fontFamily: 'var(--font-tajawal), var(--font-amiri), serif',
        textAlign: 'center',
        padding: '1.5rem',
      }}
    >
      <style>{`@keyframes lut-redirect-spin { to { transform: rotate(360deg) } }`}</style>
      <span
        aria-hidden="true"
        style={{
          width: '44px',
          height: '44px',
          display: 'inline-block',
          borderRadius: '9999px',
          border: '3px solid rgba(201, 162, 78, 0.22)',
          borderTopColor: '#c9a25e',
          animation: 'lut-redirect-spin 0.9s linear infinite',
        }}
      />
      <span style={{ fontSize: '1.0625rem', fontWeight: 500, lineHeight: 1.8 }}>
        جاري تحويلك إلى الصفحة المطلوبة…
      </span>
      <span style={{ fontSize: '0.875rem', color: 'rgba(245, 239, 228, 0.55)', lineHeight: 1.6 }}>
        Redirecting you to the requested page…
      </span>
    </div>
  )
}
