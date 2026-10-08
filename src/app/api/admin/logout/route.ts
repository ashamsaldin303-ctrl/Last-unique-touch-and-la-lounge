import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE_NAME, getAdminSession, revokeSessionsBefore } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/logout — revokes outstanding session tokens server-side
 * and clears the admin session cookie.
 *
 * CSRF note (audit r1-a1 F7): the cookie keeps `SameSite=Lax` on purpose —
 * `Strict` would break top-level navigation to the admin panel, while Lax
 * already blocks SENDING the cookie on cross-site POSTs. This route only
 * acts on POST (any other verb is auto-405 by the App Router), so a
 * cross-site form can at worst clear an already-unusable cookie.
 *
 * Auth gate (audit r2 NEW-1): the revocation epoch is bumped ONLY when the
 * request itself carries a currently-valid admin token. An unauthenticated
 * POST (no cookie / expired / forged token) merely clears the cookie —
 * otherwise any anonymous caller could loop `POST /logout` and keep every
 * admin permanently logged out (global session DoS).
 */
export async function POST(req: NextRequest) {
  // Server-side revocation (audit r1-a1 F3): tokens minted at or before NOW
  // are rejected by parseSessionToken for the lifetime of this process —
  // a stolen token no longer survives logout until its 8h `exp`. Bump the
  // epoch ONLY for a request authenticated by a still-valid token (r2 NEW-1).
  if (getAdminSession(req)) {
    revokeSessionsBefore(Date.now())
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return res
}
