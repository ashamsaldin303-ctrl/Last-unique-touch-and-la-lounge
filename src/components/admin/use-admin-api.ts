'use client'

/**
 * useAdminApi — the shared LIST-LOAD plumbing for the three admin panels
 * (products / orders / messages). Extracted in wave 5 (task 37-6-c) from
 * three hand-rolled copies that had already begun to drift (r2 §3: the
 * messages panel was missing its AbortController).
 *
 * One call replaces each panel's requestIdRef + abortRef + loading/error/
 * sessionExpired triad:
 *
 *   const url = useMemo(() => `/api/admin/…?${params}`, [filters…])
 *   const { data, error, loading, sessionExpired, reload,
 *           setData, markUnauthorized } = useAdminApi<Page>(url, [url])
 *
 * Contract:
 *   - `url: string | null` — the full GET URL; `null` pauses fetching
 *     (no request fires, nothing resets). The url is expected to encode
 *     the panel's filters, so a new identity re-runs the effect.
 *   - `deps` — extra caller-owned effect triggers, spread into the load
 *     effect (react-hooks/exhaustive-deps is off repo-wide; the panels'
 *     precedent owns its dependency arrays explicitly).
 *   - 401 → dispatches the wave-wide `admin:unauthorized` CustomEvent
 *     (the admin shell in views/admin.tsx listens and drops to the login
 *     gate) + flips `sessionExpired` so the panel can show its local
 *     notice in the frame before the shell unmounts it.
 *   - Stale-response guard: every load takes a sequence id; responses
 *     from any but the latest load are discarded (covers aborted and
 *     superseded requests alike).
 *   - In-flight requests are aborted on re-runs AND on unmount.
 *   - `reload()` — stable refetch of the current url (mutations call it
 *     after PATCH/DELETE instead of holding a private nonce state).
 *   - `setData` — the same React state the loads fill, exposed so the
 *     panels' optimistic mutation updates (kept in the panels) can patch
 *     rows without a refetch round-trip.
 *   - `markUnauthorized()` — dispatches the 401 signal + flags the local
 *     sessionExpired/loading/error state; the panels' mutation fetches
 *     call it from their own 401 branches.
 *
 * Mutation fetches (POST/PATCH/DELETE) stay in the panels — this hook is
 * strictly the read path.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'

/** Fire the wave-wide session-expired signal (the admin shell listens). */
function signalAdminUnauthorized(): void {
  window.dispatchEvent(new CustomEvent('admin:unauthorized'))
}

export interface UseAdminApiResult<T> {
  /** Last successful JSON body (null until the first success). */
  data: T | null
  /** Failure message for the latest load (null when it succeeded). */
  error: string | null
  /** True while a request is in flight (starts true — panels skeleton). */
  loading: boolean
  /** True after a 401 — panels swap their body for a session notice. */
  sessionExpired: boolean
  /** Force a refetch of the current url. Stable identity. */
  reload: () => void
  /** Latest AbortController, for callers that need manual aborts. */
  abortRef: RefObject<AbortController | null>
  /** The state the loads fill — optimistic mutations patch it directly. */
  setData: Dispatch<SetStateAction<T | null>>
  /** 401 signal + local flags, shared by the hook and panel mutations. */
  markUnauthorized: () => void
}

/**
 * `url: null` pauses fetching. `deps` are spread into the effect trigger
 * alongside the url (see the module header for the full contract).
 */
export function useAdminApi<T>(
  url: string | null,
  deps: DependencyList
): UseAdminApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  /** Sequence guard — a stale response can never overwrite newer state. */
  const requestIdRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  /** Bumped by reload() to re-run the effect without changing the url. */
  const [nonce, setNonce] = useState(0)

  const load = useCallback(() => {
    if (url === null) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const id = ++requestIdRef.current
    setLoading(true)
    setError(null)
    setSessionExpired(false)

    fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (requestIdRef.current !== id) return
        if (res.status === 401) {
          signalAdminUnauthorized()
          setSessionExpired(true)
          setLoading(false)
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as T
        if (requestIdRef.current !== id) return
        setData(json)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== id) return
        if ((err as { name?: string } | null)?.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'network error')
        setLoading(false)
      })
  }, [url])

  /* Load on mount and whenever the url / caller deps change. Cleanup
     aborts the in-flight request on re-runs and on unmount (this is the
     AbortController the messages panel was missing before the split). */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/filter sync sets the loading flag before the async fetch (data-fetch pattern, cf. views/products.tsx)
    load()
    return () => {
      abortRef.current?.abort()
    }
  }, [load, nonce, ...deps])

  /** Stable refetch trigger — bumps the nonce without touching the url. */
  const reload = useCallback(() => {
    setNonce((n) => n + 1)
  }, [])

  /** 401 branch shared by the hook's loads and the panels' mutations. */
  const markUnauthorized = useCallback(() => {
    signalAdminUnauthorized()
    setSessionExpired(true)
    setLoading(false)
    setError(null)
  }, [])

  return { data, error, loading, sessionExpired, reload, abortRef, setData, markUnauthorized }
}
