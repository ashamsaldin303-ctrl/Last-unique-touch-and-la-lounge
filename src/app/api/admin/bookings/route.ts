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
 * contains), `page` (default 1), `pageSize` (default 20, max 100).
 */
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const { searchParams } = new URL(req.url)
    const { page, pageSize } = parsePagination(searchParams)
    const status = searchParams.get('status')
    const q = searchParams.get('q')?.trim()

    const where: Prisma.BookingWhereInput = {}
    if (isBookingStatus(status)) where.status = status
    if (q) {
      where.OR = [
        { customerName: { contains: q } },
        { customerPhone: { contains: q } },
        { customerEmail: { contains: q } },
      ]
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

    const items = bookings.map((booking) => ({
      ...booking,
      productNameAr: booking.product?.nameAr ?? null,
      productNameEn: booking.product?.nameEn ?? null,
      productBrand: booking.product?.brand ?? null,
    }))

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
