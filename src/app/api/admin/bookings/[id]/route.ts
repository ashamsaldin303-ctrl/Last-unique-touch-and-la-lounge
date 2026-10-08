import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { guardBodySize } from '@/app/api/_lib/guards'
import { logSecurityEvent, requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/** Body-size cap for the JSON status payload. */
const MAX_BODY_BYTES = 256 * 1024

const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const
type BookingStatus = (typeof BOOKING_STATUSES)[number]

const statusSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
})

/**
 * Allowed booking status transitions (audit r1-a2 F5): a state machine, not a
 * free-for-all — cancelled/completed bookings are terminal, PENDING may be
 * confirmed or cancelled, CONFIRMED may be completed or cancelled.
 */
const ALLOWED_TRANSITIONS: Record<string, readonly BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED', 'COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
}

/**
 * PATCH /api/admin/bookings/[id] — update booking status (protected).
 * Body: `{ status }` (extra fields are ignored, as before). Invalid value →
 * 400; unknown booking → 404; disallowed transition → 409
 * `{ error: 'invalid_transition' }`. Returns `{ ok: true, status }`.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const oversized = guardBodySize(req, MAX_BODY_BYTES)
  if (oversized) return oversized

  try {
    const { id } = await params
    const body = await req.json().catch(() => null)
    const parsed = statusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }

    const existing = await db.booking.findFirst({
      where: { id },
      select: { id: true, status: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const next = parsed.data.status
    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? []
    if (!allowed.includes(next)) {
      return NextResponse.json({ error: 'invalid_transition' }, { status: 409 })
    }

    try {
      await db.booking.update({ where: { id }, data: { status: next } })
    } catch (error) {
      // TOCTOU: row deleted between the findFirst and the update.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
      throw error
    }

    logSecurityEvent('admin_booking_status', req, { id, from: existing.status, to: next })
    return NextResponse.json({ ok: true, status: next })
  } catch (error) {
    console.error('[api/admin/bookings/[id]] PATCH error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/bookings/[id] — delete a booking (protected).
 * Only PENDING or CANCELLED bookings are deletable (409
 * `{ error: 'not_deletable' }` otherwise — CONFIRMED/COMPLETED rows are
 * revenue-relevant history, audit r1-a2 F6). Unknown id → 404.
 * Success → 200 `{ ok: true }` + SecurityLog.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const { id } = await params
    const existing = await db.booking.findFirst({
      where: { id },
      select: { id: true, status: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    if (existing.status !== 'CANCELLED' && existing.status !== 'PENDING') {
      return NextResponse.json({ error: 'not_deletable' }, { status: 409 })
    }

    try {
      await db.booking.delete({ where: { id } })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
      throw error
    }

    logSecurityEvent('admin_booking_delete', req, { id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/admin/bookings/[id]] DELETE error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
