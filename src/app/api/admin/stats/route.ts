import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/stats — dashboard counters (protected).
 *
 * `expectedRevenue` sums CONFIRMED **and** COMPLETED bookings (audit r3-r5 M1):
 * the allowed CONFIRMED→COMPLETED transition previously dropped realized
 * revenue from the only revenue KPI (completing the last confirmed booking
 * zeroed the dashboard despite delivered business).
 *
 * Note: `unreadMessages` uses $queryRaw because the long-running dev server
 * may hold a PrismaClient instance instantiated before the `read` column was
 * added to the schema (raw SQL works regardless of the cached client's DMMF).
 */
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
      totalBookings,
      statusGroups,
      revenue,
      totalMessages,
      unreadRows,
      totalProducts,
      activeProducts,
      last7Bookings,
    ] = await Promise.all([
      db.booking.count(),
      db.booking.groupBy({ by: ['status'], _count: { _all: true } }),
      // CONFIRMED (open) + COMPLETED (realized) — CANCELLED stays excluded.
      db.booking.aggregate({
        where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
        _sum: { totalAmount: true },
      }),
      db.contactMessage.count(),
      db.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`SELECT COUNT(*) AS count FROM ContactMessage WHERE "read" = 0`,
      ),
      db.product.count(),
      db.product.count({ where: { isActive: true } }),
      db.booking.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ])

    const byStatus = new Map(statusGroups.map((g) => [g.status, g._count._all]))
    const expectedRevenue = Math.round((revenue._sum.totalAmount ?? 0) * 1000) / 1000

    return NextResponse.json({
      totalBookings,
      pendingBookings: byStatus.get('PENDING') ?? 0,
      confirmedBookings: byStatus.get('CONFIRMED') ?? 0,
      cancelledBookings: byStatus.get('CANCELLED') ?? 0,
      completedBookings: byStatus.get('COMPLETED') ?? 0,
      expectedRevenue,
      totalMessages,
      unreadMessages: Number(unreadRows[0]?.count ?? 0),
      totalProducts,
      activeProducts,
      last7Bookings,
    })
  } catch (error) {
    console.error('[api/admin/stats] GET error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
