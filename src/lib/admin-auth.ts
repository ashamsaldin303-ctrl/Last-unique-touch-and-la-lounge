import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Admin authentication — HMAC-SHA256 signed session cookie (`lut_admin`).
 *
 * Token format: `base64url(JSON payload).hex(HMAC-SHA256(payload))`
 * Payload: `{ iat: number, exp: number }` (epoch milliseconds).
 * Secret: `process.env.ADMIN_SESSION_SECRET`.
 */

export const ADMIN_COOKIE_NAME = 'lut_admin'

/** Session lifetime in seconds (8 hours) — used for the cookie `maxAge`. */
export const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60

/** Session lifetime in milliseconds — used for the token payload `exp`. */
const SESSION_TTL_MS = ADMIN_SESSION_MAX_AGE * 1000

// Fail closed (audit r1-a1 F1): a missing/empty ADMIN_SESSION_SECRET must
// NEVER sign or verify tokens — an empty HMAC key is a KNOWN key, so every
// token would be forgeable and requireAdmin would let anyone in. The warning
// below is unconditional (NOT dev-only): production is exactly where a silent
// misconfig is fatal, and .env has been wiped before (worklog task 31).
// Fail-closed behavior: hmacHex() throws (login answers 500) and
// parseSessionToken() returns null (all protected admin routes answer 401)
// while public routes keep working — nothing throws at module load.
if (!process.env.ADMIN_SESSION_SECRET) {
  console.error(
    '[admin-auth] ADMIN_SESSION_SECRET is not set — admin sessions are DISABLED (fail closed)',
  )
}

interface SessionPayload {
  iat: number
  exp: number
}

function hmacHex(data: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    // Fail closed: refuse to sign with an empty key. login's try/catch maps
    // this to a uniform 500 `{ error: 'internal_error' }` — no internals leak.
    throw new Error('[admin-auth] ADMIN_SESSION_SECRET is not set — refusing to sign session tokens')
  }
  return createHmac('sha256', secret).update(data, 'utf8').digest('hex')
}

/** Constant-time string comparison (hash both sides first so lengths match). */
export function secureCompare(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a, 'utf8').digest()
  const hashB = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(hashA, hashB)
}

export function createSessionToken(): string {
  const iat = Date.now()
  const exp = iat + SESSION_TTL_MS
  const payload = Buffer.from(JSON.stringify({ iat, exp } satisfies SessionPayload), 'utf8').toString(
    'base64url',
  )
  return `${payload}.${hmacHex(payload)}`
}

// ---- Server-side session revocation (audit r1-a1 F3) ----
// Logout must invalidate the token server-side, not just clear the cookie
// (an exfiltrated token would otherwise stay valid for the full 8h TTL).
// We keep an epoch: every token minted at or before it is rejected inside
// parseSessionToken, so logout revokes ALL outstanding tokens.
// LIMITATION: process memory only (kept on globalThis to survive dev HMR);
// a multi-instance deployment would need a shared store (DB/Redis).
// Acceptable here: single Node process, and the cookie is cleared as well.
const globalForRevocation = globalThis as unknown as { __lutAdminRevokedBefore?: number }

function revokedBeforeMs(): number {
  return globalForRevocation.__lutAdminRevokedBefore ?? 0
}

/** Invalidate every session token minted at or before `iatMs` (used by logout). */
export function revokeSessionsBefore(iatMs: number): void {
  globalForRevocation.__lutAdminRevokedBefore = Math.max(revokedBeforeMs(), iatMs)
}

function parseSessionToken(token: string): SessionPayload | null {
  // Fail closed: never verify with a missing secret (an empty HMAC key would
  // accept forged tokens) — reject every token instead. Protected admin
  // routes answer 401 while public routes keep working.
  if (!process.env.ADMIN_SESSION_SECRET) return null
  if (typeof token !== 'string' || token.length === 0) return null
  const dot = token.indexOf('.')
  if (dot <= 0 || dot === token.length - 1) return null
  const payload = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  const expected = Buffer.from(hmacHex(payload), 'utf8')
  const given = Buffer.from(signature, 'utf8')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<SessionPayload>
    if (typeof decoded.iat !== 'number' || typeof decoded.exp !== 'number') return null
    // Server-side revocation (logout): reject tokens minted at or before the
    // latest logout epoch — see revokeSessionsBefore above.
    if (decoded.iat <= revokedBeforeMs()) return null
    return decoded as SessionPayload
  } catch {
    return null
  }
}

export function verifySessionToken(token: string): boolean {
  const payload = parseSessionToken(token)
  return payload !== null && payload.exp > Date.now()
}

/** Returns the epoch-millisecond expiry of a valid token, or null. */
export function readSessionExpiry(token: string): number | null {
  const payload = parseSessionToken(token)
  return payload !== null && payload.exp > Date.now() ? payload.exp : null
}

export function getAdminSession(req: NextRequest): boolean {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value
  return token !== undefined && verifySessionToken(token)
}

/**
 * Best-effort client IP for rate-limit keys and SecurityLog rows.
 *
 * Trust model (audit r1-a1 F2): exactly ONE trusted reverse proxy that
 * APPENDS the real client IP to `x-forwarded-for`. Under that model the
 * RIGHTMOST (last) comma-separated entry is the hop our proxy added, while
 * the FIRST entry is client-supplied and trivially spoofable (it previously
 * keyed the login rate limiter, so one rotated header reset the whole
 * failure window). With no XFF header we normalize to the shared
 * `'unknown'` bucket so all direct traffic limits together.
 *
 * TRUST_PROXY gate (audit r1 F5 / r3-r1): the rightmost-hop logic is only
 * sound when the app actually sits BEHIND a trusted appending proxy, so
 * XFF is honored ONLY when explicitly opted in — `TRUST_PROXY=1` — or in
 * non-production (unset AND NODE_ENV !== 'production'), which keeps the
 * sandbox/dev gateway setup working out of the box. In PRODUCTION with
 * TRUST_PROXY unset (or `0`), the header is IGNORED entirely: a
 * client-supplied single-hop XFF would otherwise mint a fresh rate-limit
 * bucket per request, and every request falls back to the shared
 * `'unknown'` bucket so all traffic limits together. Deployments behind a
 * trusted reverse proxy (the Caddy gateway) must set `TRUST_PROXY=1`.
 */
export function getClientIp(req: NextRequest): string {
  const trustProxy = process.env.TRUST_PROXY
  const trustForwardedFor =
    trustProxy === '1' ||
    (trustProxy === undefined && process.env.NODE_ENV !== 'production')
  if (!trustForwardedFor) return 'unknown'
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const last = forwarded.split(',').pop()?.trim()
    if (last) return last
  }
  return 'unknown'
}

// ---- SecurityLog write-amplification throttle (audit r1-a1 F4) ----
// Any unauthenticated caller can hit protected admin routes at line rate,
// and one DB INSERT per 401 is unbounded write amplification (disk
// exhaustion + drowning the real admin_login_failed signal). Throttle the
// `admin_unauthorized` event only: at most one row per (ip, path) per 60s,
// plus a hard cap per window. All other events log exactly as before.
const UNAUTHORIZED_LOG_DEDUPE_MS = 60 * 1000
const UNAUTHORIZED_LOG_MAX_PER_WINDOW = 100

const globalForLogThrottle = globalThis as unknown as {
  __lutUnauthorizedLogAt?: Map<string, number>
}
const unauthorizedLogAt: Map<string, number> = globalForLogThrottle.__lutUnauthorizedLogAt ?? new Map()
globalForLogThrottle.__lutUnauthorizedLogAt = unauthorizedLogAt

/** True when this `admin_unauthorized` event must be skipped (throttled). */
function shouldThrottleUnauthorizedLog(ip: string, path: string): boolean {
  const now = Date.now()
  // Sweep expired dedupe keys on insert — the map stays tiny.
  if (unauthorizedLogAt.size > 1_000) {
    for (const [key, at] of unauthorizedLogAt) {
      if (now - at >= UNAUTHORIZED_LOG_DEDUPE_MS) unauthorizedLogAt.delete(key)
    }
  }
  // Hard cap per window: even a flood of distinct (ip, path) keys writes at
  // most UNAUTHORIZED_LOG_MAX_PER_WINDOW rows per 60s in total.
  let inWindow = 0
  for (const at of unauthorizedLogAt.values()) {
    if (now - at < UNAUTHORIZED_LOG_DEDUPE_MS) inWindow += 1
  }
  if (inWindow >= UNAUTHORIZED_LOG_MAX_PER_WINDOW) return true
  const key = `${ip}:${path}`
  const last = unauthorizedLogAt.get(key)
  if (last !== undefined && now - last < UNAUTHORIZED_LOG_DEDUPE_MS) return true
  unauthorizedLogAt.set(key, now)
  return false
}

// ---- PII masking in SecurityLog details (audit r1-a3 #10) ----
// SecurityLog is an operational audit trail, not a CRM: customer emails and
// phone numbers must not be persisted in plaintext there (visibility is
// admin-only, but defense-in-depth against DB/log exfiltration). Values are
// masked as `ab***yz` (first 2 + last 2 chars); anything too short to split
// collapses to `***` (still records THAT a value was provided).

/** Mask one PII value: `john@example.com` → `jo***om`, `+96512345678` → `+9***78`. */
export function maskPiiValue(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length < 5) return '***'
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`
}

/** Detail keys whose string values are treated as email/phone PII. */
const PII_DETAIL_KEY = /email|phone|mobile/i

/**
 * Mask email/phone-like keys in a details object before it is persisted.
 * Matching is by KEY name only — other string values pass through untouched.
 */
export function maskPiiDetails(details: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(details)) {
    masked[key] =
      typeof value === 'string' && PII_DETAIL_KEY.test(key) ? maskPiiValue(value) : value
  }
  return masked
}

/**
 * Fire-and-forget SecurityLog write — logging must never break a request.
 * `details` values are masked (see maskPiiDetails) before persistence.
 */
export function logSecurityEvent(
  event: string,
  req: NextRequest,
  details?: Record<string, unknown>,
): void {
  try {
    if (event === 'admin_unauthorized') {
      const path = details !== undefined && typeof details.path === 'string' ? details.path : ''
      if (shouldThrottleUnauthorizedLog(getClientIp(req), path)) return
    }
    void db.securityLog
      .create({
        data: {
          event,
          ip: getClientIp(req),
          details: details === undefined ? null : JSON.stringify(maskPiiDetails(details)),
        },
      })
      .catch((err: unknown) => {
        // Surface write failures — logging must never break the request, but
        // a dead SecurityLog table should not pass unnoticed.
        console.error('[admin-auth] security log write failed:', err)
      })
  } catch {
    // ignore — security logging is best-effort (sync throw path: e.g. a
    // shut-down Prisma client during hot reload)
  }
}

/**
 * Guard for protected admin routes.
 * Returns a 401 `{ error: 'unauthorized' }` response when the session is
 * invalid (and logs `admin_unauthorized` with the request path), or null
 * when the caller is authenticated and should proceed.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  if (getAdminSession(req)) return null
  logSecurityEvent('admin_unauthorized', req, { path: req.nextUrl.pathname })
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}
