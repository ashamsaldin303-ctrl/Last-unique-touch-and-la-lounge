import { NextResponse } from 'next/server'

// Consistency with the 21 other route files under src/app/api/** (audit
// r3-r3 L4): handlers are dynamic-by-default in Next 16, but the explicit
// export documents intent uniformly across the API surface.
export const dynamic = 'force-dynamic'

/** Minimal public root endpoint — replaces the Next.js "Hello, world!" scaffold. */
export async function GET() {
  return NextResponse.json({ name: 'LUT Luxury API', status: 'ok' })
}
