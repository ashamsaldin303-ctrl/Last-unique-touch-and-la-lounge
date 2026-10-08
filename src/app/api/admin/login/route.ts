import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { guardBodySize } from '@/app/api/_lib/guards'
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE,
  createSessionToken,
  getClientIp,
  logSecurityEvent,
  secureCompare,
} from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const loginSchema = z.object({
  password: z.string().min(1).max(200),
})

// ---- In-memory rate limiter (per failed attempt, per IP, 15-minute window) ----
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX_FAILURES = 5

// Memory bound (audit r1-a1 F2): distinct IP keys (spoofed or real) must not
// grow the failure map without limit — sweep expired entries on insert once
// the map exceeds this size.
const MAX_TRACKED_IPS = 10_000

const globalForRate = globalThis as unknown as { __lutAdminRateLimit?: Map<string, number[]> }
const failuresByIp: Map<string, number[]> = globalForRate.__lutAdminRateLimit ?? new Map()
globalForRate.__lutAdminRateLimit = failuresByIp

/** Records a failed attempt for the IP and returns the count inside the window. */
function registerFailure(ip: string): number {
  const now = Date.now()
  // Bound the map: drop fully-expired entries when it grows past the cap so
  // spoofed IPs cannot exhaust memory (only fully expired entries are
  // removed — active windows are never dropped, so limiting stays correct).
  if (failuresByIp.size > MAX_TRACKED_IPS) {
    for (const [key, stamps] of failuresByIp) {
      if (stamps.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) failuresByIp.delete(key)
    }
  }
  const failures = (failuresByIp.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  failures.push(now)
  failuresByIp.set(ip, failures)
  return failures.length
}

function clearFailures(ip: string): void {
  failuresByIp.delete(ip)
}

let warnedMissingPassword = false

/**
 * POST /api/admin/login — password check (constant-time), sets the session
 * cookie on success. Failed attempts are rate limited per IP.
 */
export async function POST(req: NextRequest) {
  try {
    // Pre-parse body-size cap (login payloads are tiny by schema).
    const oversized = guardBodySize(req, 16 * 1024)
    if (oversized) return oversized

    const body = await req.json().catch(() => null)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }

    const ip = getClientIp(req)
    const password = parsed.data.password

    // Server misconfiguration guard (audit r1-a1 F8): a missing/empty
    // ADMIN_PASSWORD must not masquerade as a wrong password (the identical
    // 401 cost a whole debugging round in task 31). Fail with 500 instead.
    // The response body stays generic ({ error: 'internal_error' }) so the
    // client cannot distinguish this from any other server error. Logged
    // once per process.
    if (!process.env.ADMIN_PASSWORD) {
      if (!warnedMissingPassword) {
        warnedMissingPassword = true
        console.error(
          '[api/admin/login] ADMIN_PASSWORD is not set — admin login is impossible (server misconfiguration)',
        )
      }
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }

    if (secureCompare(password, process.env.ADMIN_PASSWORD)) {
      clearFailures(ip)
      // createSessionToken() throws when ADMIN_SESSION_SECRET is missing
      // (fail closed, admin-auth.ts) — the catch below answers 500.
      const token = createSessionToken()
      logSecurityEvent('admin_login_success', req, { ip })
      const res = NextResponse.json({ ok: true })
      res.cookies.set(ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: ADMIN_SESSION_MAX_AGE,
      })
      return res
    }

    const failures = registerFailure(ip)
    if (failures > RATE_LIMIT_MAX_FAILURES) {
      logSecurityEvent('admin_rate_limited', req, { ip, failures })
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }

    logSecurityEvent('admin_login_failed', req, { ip })
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  } catch (error) {
    console.error('[api/admin/login] POST error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
