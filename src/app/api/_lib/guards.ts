import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, logSecurityEvent } from '@/lib/admin-auth'

/**
 * Shared in-memory guards for PUBLIC endpoints (contact / orders / birthday
 * bookings). Lives in the `_lib` route-group folder — underscore-prefixed
 * folders are excluded from the Next.js routing table, so this module can
 * never be addressed as an endpoint itself.
 *
 * The rate limiter mirrors /api/admin/login: a Map stored on globalThis
 * (survives dev HMR module reloads), sliding window of timestamps, lazily
 * swept so no entry lives longer than the cleanup interval. Each route keeps
 * an INDEPENDENT window — the key is `${route}:${ip}` and the admin login
 * limiter uses a separate map entirely.
 */

/** Sweep the limiter map at most every 10 minutes (drops expired entries). */
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000

const globalForGuards = globalThis as unknown as {
  __lutPublicRateLimit?: Map<string, number[]>
}

const hitsByRouteIp: Map<string, number[]> = globalForGuards.__lutPublicRateLimit ?? new Map()
globalForGuards.__lutPublicRateLimit = hitsByRouteIp

let lastSweepAt = Date.now()

function sweep(now: number, windowMs: number): void {
  for (const [key, stamps] of hitsByRouteIp) {
    const fresh = stamps.filter((t) => now - t < windowMs)
    if (fresh.length === 0) hitsByRouteIp.delete(key)
    else hitsByRouteIp.set(key, fresh)
  }
}

/**
 * Sliding-window rate limiter. Records this request and returns a 429
 * `{ error: 'rate_limited' }` response when the IP has already made `max`
 * requests inside `windowMs`, or null when the request may proceed.
 * Rejections are written to SecurityLog (`rate_limited`).
 */
export function checkRateLimit(
  req: NextRequest,
  route: string,
  max: number,
  windowMs: number,
): NextResponse | null {
  const now = Date.now()

  if (now - lastSweepAt > CLEANUP_INTERVAL_MS) {
    lastSweepAt = now
    sweep(now, windowMs)
  }

  const ip = getClientIp(req)
  const key = `${route}:${ip}`
  const windowHits = (hitsByRouteIp.get(key) ?? []).filter((t) => now - t < windowMs)

  if (windowHits.length >= max) {
    hitsByRouteIp.set(key, windowHits)
    logSecurityEvent('rate_limited', req, { route, hits: windowHits.length })
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  windowHits.push(now)
  hitsByRouteIp.set(key, windowHits)
  return null
}

/**
 * Body-size guard (body-bomb mitigation) — rejects a request body larger
 * than `maxBytes` BEFORE `req.json()` parses it. Every zod schema caps
 * field lengths, so legitimate payloads stay far below the default.
 *
 * Audit r1-a1 F5: for body-carrying methods (POST/PUT/PATCH) a declared,
 * numeric `Content-Length` is now REQUIRED — a missing, non-numeric or
 * chunked length previously bypassed the cap entirely, so `req.json()`
 * could buffer an unbounded body straight into the heap (memory DoS).
 * Browsers/fetch/axios always send Content-Length for fixed bodies, so
 * legitimate traffic is unaffected. Rejections use 413 consistently with
 * the same `{ error: 'invalid_input' }` body. Methods that never carry a
 * body (GET/HEAD/OPTIONS/DELETE) skip the check.
 */
export function guardBodySize(req: NextRequest, maxBytes = 128 * 1024): NextResponse | null {
  const method = req.method.toUpperCase()
  const carriesBody = method === 'POST' || method === 'PUT' || method === 'PATCH'
  if (carriesBody) {
    const raw = req.headers.get('content-length')
    const chunked = (req.headers.get('transfer-encoding') ?? '')
      .toLowerCase()
      .includes('chunked')
    const declared = raw === null ? Number.NaN : Number(raw)
    if (chunked || !Number.isFinite(declared) || declared < 0) {
      logSecurityEvent('oversized_body_rejected', req, {
        reason: chunked ? 'chunked' : 'invalid_content_length',
      })
      return NextResponse.json({ error: 'invalid_input' }, { status: 413 })
    }
    if (declared > maxBytes) {
      logSecurityEvent('oversized_body_rejected', req, { bytes: declared })
      return NextResponse.json({ error: 'invalid_input' }, { status: 413 })
    }
  }
  return null
}
