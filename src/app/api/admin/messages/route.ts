import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

function parsePagination(searchParams: URLSearchParams): { page: number; pageSize: number } {
  const page = Number.parseInt(searchParams.get('page') ?? '', 10)
  const pageSize = Number.parseInt(searchParams.get('pageSize') ?? '', 10)
  return {
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize >= 1 ? Math.min(pageSize, 100) : 20,
  }
}

/**
 * GET /api/admin/messages — paginated contact messages (protected).
 * Query params: `read` (true/false, empty = all), `page`, `pageSize`.
 *
 * Note: this previously used $queryRaw as a workaround for a long-running dev
 * PrismaClient instantiated before the `read` column existed (stale DMMF).
 * Verified live (task 37-2-j): the current dev-server client handles the
 * `read` field fine, so the raw SQL was replaced with normal typed Prisma
 * calls — same response shape (booleans, ISO dates), no hand-written SQL to
 * drift from the schema.
 */
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const { searchParams } = new URL(req.url)
    const { page, pageSize } = parsePagination(searchParams)
    const readParam = searchParams.get('read')

    const where: Prisma.ContactMessageWhereInput = {}
    if (readParam === 'true') where.read = true
    else if (readParam === 'false') where.read = false

    const [total, items] = await Promise.all([
      db.contactMessage.count({ where }),
      db.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('[api/admin/messages] GET error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
