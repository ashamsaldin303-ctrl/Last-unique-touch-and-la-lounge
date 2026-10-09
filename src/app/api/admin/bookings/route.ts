import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const
type BookingStatus = (typeof BOOKING_STATUSES)[number]

function isBookingStatus(value: string | null): value is BookingStatus {
  return value !== null && (BOOKING_STATUSES as readonly string[]).includes(value)
}

/** The three houses (SQLite stores brands as plain strings). */
const BRANDS = ['LUT', 'LA_LOUNGE', 'YOUR_BIRTHDAY'] as const

function isBrand(value: string | null): value is (typeof BRANDS)[number] {
  return value !== null && (BRANDS as readonly string[]).includes(value)
}

function parsePagination(searchParams: URLSearchParams): { page: number; pageSize: number } {
  const page = Number.parseInt(searchParams.get('page') ?? '', 10)
  const pageSize = Number.parseInt(searchParams.get('pageSize') ?? '', 10)
  return {
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize >= 1 ? Math.min(pageSize, 100) : 20,
  }
}

/**
 * GET /api/admin/bookings — paginated booking list (protected).
 * Query params: `status` (optional filter), `q` (customer name/phone/email
 * contains), `brand` (optional — scope to one house, Task 38 brand pages),
 * `page` (default 1), `pageSize` (default 20, max 100).
 */
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const { searchParams } = new URL(req.url)
    const { page, pageSize } = parsePagination(searchParams)
    const status = searchParams.get('status')
    // LIKE wildcard sanitization (Loop 1 finding, audit 38-R1-b): Prisma
    // `contains` on SQLite does NOT escape the LIKE metacharacters `%`/`_`
    // (searching `q=%` matched every row), so both are stripped — keeping
    // `contains` a literal substring test. A term made ONLY of wildcards
    // reduces to '' and is answered with an empty set (`id in []`) instead
    // of silently degrading to match-all (same contract as products route).
    const qRaw = searchParams.get('q')?.trim()
    const q = qRaw?.replace(/[%_]/g, '')
    const brand = searchParams.get('brand')

    const where: Prisma.BookingWhereInput = {}
    if (isBookingStatus(status)) where.status = status
    if (isBrand(brand)) where.brand = brand
    if (qRaw) {
      where.OR = q
        ? [
            { customerName: { contains: q } },
            { customerPhone: { contains: q } },
            { customerEmail: { contains: q } },
          ]
        : [{ id: { in: [] } }]
    }

    const [total, bookings] = await Promise.all([
      db.booking.count({ where }),
      db.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          product: { select: { id: true, brand: true, slug: true, nameAr: true, nameEn: true } },
        },
      }),
    ])

    const items = bookings.map((booking) => {
      // Destructure the product relation out — it is already flattened into
      // the productName*/productBrand fields below, so the row must not
      // carry the nested object too (Loop 1 finding 38-R1-b: payload noise).
      const { product, ...row } = booking
      return {
        ...row,
        productNameAr: product?.nameAr ?? null,
        productNameEn: product?.nameEn ?? null,
        productBrand: product?.brand ?? null,
      }
    })

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('[api/admin/bookings] GET error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
