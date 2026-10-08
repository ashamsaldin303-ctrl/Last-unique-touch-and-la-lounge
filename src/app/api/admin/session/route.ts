import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE_NAME, readSessionExpiry, verifySessionToken } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/session — safe probe (never 401).
 * Returns `{ authenticated: true, expiresAt }` for a valid session, otherwise
 * `{ authenticated: false }`.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value
  if (token !== undefined && verifySessionToken(token)) {
    const expiresAt = readSessionExpiry(token)
    return NextResponse.json({ authenticated: true, expiresAt: expiresAt ?? 0 })
  }
  return NextResponse.json({ authenticated: false })
}
