import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { guardBodySize } from '@/app/api/_lib/guards'
import { logSecurityEvent, requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/** Body-size cap for the JSON read/unread toggle payload. */
const MAX_BODY_BYTES = 256 * 1024

const readSchema = z.object({
  read: z.boolean(),
})

/**
 * PATCH /api/admin/messages/[id] — mark a message read/unread (protected).
 * Body: `{ read: boolean }` → `{ ok: true }`.
 *
 * Note: this previously used $queryRaw/$executeRaw as a workaround for a
 * stale dev PrismaClient (pre-`read`-column DMMF). Verified live (task
 * 37-2-j): the current client handles the field, so it is now a normal
 * typed Prisma update — same behavior, P2025-safe 404 mapping included.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const oversized = guardBodySize(req, MAX_BODY_BYTES)
  if (oversized) return oversized

  try {
    const { id } = await params
    const body = await req.json().catch(() => null)
    const parsed = readSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }

    const existing = await db.contactMessage.findFirst({ where: { id }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    try {
      await db.contactMessage.update({ where: { id }, data: { read: parsed.data.read } })
    } catch (error) {
      // TOCTOU: row deleted between the findFirst and the update.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
      throw error
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/admin/messages/[id]] PATCH error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/messages/[id] — delete a message (protected).
 * Unknown id → 404. Success → 200 `{ ok: true }` + SecurityLog
 * (audit r1-a2 F10: destructive admin mutations must leave a trace).
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const { id } = await params
    try {
      await db.contactMessage.delete({ where: { id } })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
      throw error
    }

    logSecurityEvent('admin_message_delete', req, { id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/admin/messages/[id]] DELETE error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
