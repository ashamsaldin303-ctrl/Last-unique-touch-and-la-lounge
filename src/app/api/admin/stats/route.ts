import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/** The three houses (SQLite stores brands as plain strings). */
const BRANDS = ['LUT', 'LA_LOUNGE', 'YOUR_BIRTHDAY'] as const
type Brand = (typeof BRANDS)[number]

function isBrand(value: string | null): value is Brand {
  return value !== null && (BRANDS as readonly string[]).includes(value)
}

/** Per-house counters for the overview's brand cards. */
interface BrandStats {
  products: number
  activeProducts: number
  bookings: number
  pendingBookings: number
  revenue: number
}

/**
 * GET /api/admin/stats — dashboard counters (protected).
 *
 * Query params:
 *   · `brand` (optional) — scope EVERY counter to one house
 *     (LUT | LA_LOUNGE | YOUR_BIRTHDAY). The response shape is identical
 *     to the global one; the numbers are the house's own (Task 38 brand
 *     pages). An unknown value is ignored (global response).
 *   · (no param) — the global overview response additionally carries
 *     `brands: { LUT, LA_LOUNGE, YOUR_BIRTHDAY }` counters for the brand
 *     house cards.
 *
 * `expectedRevenue` sums CONFIRMED **and** COMPLETED bookings (audit
 * r3-r5 M1): the allowed CONFIRMED→COMPLETED transition previously
 * dropped realized revenue from the only revenue KPI.
 *
 * Note: `unreadMessages` uses $queryRaw because the long-running dev
 * server may hold a PrismaClient instance instantiated before the `read`
 * column was added to the schema (raw SQL works regardless of the cached
 * client's DMMF).
 */
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const { searchParams } = new URL(req.url)
    const brandParam = searchParams.get('brand')
    const scoped = isBrand(brandParam) ? brandParam : null

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const bookingWhere: Prisma.BookingWhereInput = scoped ? { brand: scoped } : {}
    const productWhere: Prisma.ProductWhereInput = scoped ? { brand: scoped } : {}
    const messageWhere: Prisma.ContactMessageWhereInput = scoped ? { brand: scoped } : {}
    const revenueWhere: Prisma.BookingWhereInput = {
      ...(scoped ? { brand: scoped } : {}),
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    }

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
      db.booking.count({ where: bookingWhere }),
      db.booking.groupBy({
        by: ['status'],
        where: bookingWhere,
        _count: { _all: true },
      }),
      // CONFIRMED (open) + COMPLETED (realized) — CANCELLED stays excluded.
      db.booking.aggregate({
        where: revenueWhere,
        _sum: { totalAmount: true },
      }),
      db.contactMessage.count({ where: messageWhere }),
      db.$queryRaw<Array<{ count: bigint }>>(
        scoped
          ? Prisma.sql`SELECT COUNT(*) AS count FROM ContactMessage WHERE "read" = 0 AND brand = ${scoped}`
          : Prisma.sql`SELECT COUNT(*) AS count FROM ContactMessage WHERE "read" = 0`,
      ),
      db.product.count({ where: productWhere }),
      db.product.count({
        where: { ...productWhere, isActive: true },
      }),
      db.booking.count({
        where: { ...bookingWhere, createdAt: { gte: sevenDaysAgo } },
      }),
    ])

    const byStatus = new Map(statusGroups.map((g) => [g.status, g._count._all]))
    const expectedRevenue = Math.round((revenue._sum.totalAmount ?? 0) * 1000) / 1000

    /* Per-house breakdown — only for the global (unscoped) response. */
    let brands: Record<Brand, BrandStats> | undefined
    if (!scoped) {
      const [bookingGroups, pendingGroups, revenueGroups, productGroups, activeProductGroups] =
        await Promise.all([
          db.booking.groupBy({ by: ['brand'], _count: { _all: true } }),
          db.booking.groupBy({
            by: ['brand'],
            where: { status: 'PENDING' },
            _count: { _all: true },
          }),
          db.booking.groupBy({
            by: ['brand'],
            where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
            _sum: { totalAmount: true },
          }),
          db.product.groupBy({ by: ['brand'], _count: { _all: true } }),
          db.product.groupBy({
            by: ['brand'],
            where: { isActive: true },
            _count: { _all: true },
          }),
        ])

      const empty = (): BrandStats => ({
        products: 0,
        activeProducts: 0,
        bookings: 0,
        pendingBookings: 0,
        revenue: 0,
      })
      brands = { LUT: empty(), LA_LOUNGE: empty(), YOUR_BIRTHDAY: empty() }

      for (const g of bookingGroups) {
        if (isBrand(g.brand)) brands[g.brand].bookings = g._count._all
      }
      for (const g of pendingGroups) {
        if (isBrand(g.brand)) brands[g.brand].pendingBookings = g._count._all
      }
      for (const g of revenueGroups) {
        if (isBrand(g.brand)) {
          brands[g.brand].revenue = Math.round((g._sum.totalAmount ?? 0) * 1000) / 1000
        }
      }
      for (const g of productGroups) {
        if (isBrand(g.brand)) brands[g.brand].products = g._count._all
      }
      for (const g of activeProductGroups) {
        if (isBrand(g.brand)) brands[g.brand].activeProducts = g._count._all
      }
    }

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
      ...(brands ? { brands } : {}),
    })
  } catch (error) {
    console.error('[api/admin/stats] GET error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
