'use client'

/**
 * useAdminSession — the shared ADMIN session plumbing (Task 38), extracted
 * from views/admin.tsx so BOTH admin pages (the overview and the three
 * brand pages) run the identical gate:
 *
 *   - GET  /api/admin/session  → { authenticated } (probe on mount)
 *   - POST /api/admin/login    → 200 {ok} | 401 invalid_credentials | 429
 *   - POST /api/admin/logout   → {ok}
 *   - window event 'admin:unauthorized' (dispatched by useAdminApi and the
 *     panels' mutation fetches on any 401) drops the session back to the
 *     gate with the expired-session notice.
 *
 * The login FORM state (password field, submitting spinner, inline error)
 * lives in <AdminGate/> — this hook owns the phase machine only.
 */

import { useCallback, useEffect, useState } from 'react'

export type AdminAuthPhase = 'checking' | 'gate' | 'ready'

/** Result contract of `login()` for the gate's inline error handling. */
export type AdminLoginResult = 'ok' | 'invalid' | 'rate_limited' | 'server'

export interface UseAdminSessionResult {
  phase: AdminAuthPhase
  /** True after a 401 mid-session — the gate shows the expiry notice. */
  sessionExpired: boolean
  /** POST the password; resolves 'ok' only for a 200. */
  login: (password: string) => Promise<AdminLoginResult>
  /** POST logout then return to the gate (no expiry notice — deliberate). */
  logout: () => Promise<void>
  /** 401 signal for the PAGE's own fetches (stats etc.) — dispatches the
   *  global event + drops to the gate with the expiry notice. */
  markUnauthorized: () => void
}

export function useAdminSession(): UseAdminSessionResult {
  const [phase, setPhase] = useState<AdminAuthPhase>('checking')
  const [sessionExpired, setSessionExpired] = useState(false)

  /* Any 401 from the panels (window event) or a page's own fetches →
     drop to the gate with the expired notice. */
  const handleUnauthorized = useCallback(() => {
    setPhase('gate')
    setSessionExpired(true)
  }, [])

  useEffect(() => {
    window.addEventListener('admin:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('admin:unauthorized', handleUnauthorized)
  }, [handleUnauthorized])

  /* Session probe on mount — decides gate vs dashboard. A non-OK answer
     (401, or 404 while the API route is still landing) simply shows the
     gate: the house stays closed until the API answers. */
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/admin/session', { cache: 'no-store' })
        if (cancelled) return
        if (!res.ok) {
          setPhase('gate')
          return
        }
        const data = (await res.json()) as { authenticated?: boolean }
        if (cancelled) return
        setPhase(data?.authenticated ? 'ready' : 'gate')
      } catch {
        if (!cancelled) setPhase('gate')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (password: string): Promise<AdminLoginResult> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        cache: 'no-store',
      })
      if (res.ok) {
        setSessionExpired(false)
        setPhase('ready')
        return 'ok'
      }
      if (res.status === 401) return 'invalid'
      if (res.status === 429) return 'rate_limited'
      return 'server'
    } catch {
      return 'server'
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST', cache: 'no-store' })
    } catch {
      /* network hiccup — the server cookie expires on its own */
    }
    setPhase('gate')
    setSessionExpired(false)
  }, [])

  /** Mirrors the wave contract's mutation-side helper: fire the global
   *  event (panels listen) AND drop this page to the gate. */
  const markUnauthorized = useCallback(() => {
    window.dispatchEvent(new CustomEvent('admin:unauthorized'))
  }, [])

  return { phase, sessionExpired, login, logout, markUnauthorized }
}
