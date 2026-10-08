import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Stock-aware availability check — mirrors the original repo's logic:
 * sum booked quantities with overlapping dates (PENDING/CONFIRMED) and
 * compare against product stock.
 *
 * `isActive: true` in the lookup (audit r3-r5 L2): an inactive product must
 * answer 404 here, consistently with the orders route (which rejects
 * inactive products in BOTH validation phases) and the public catalog
 * (`/api/products` filters isActive) — otherwise the shop could report a
 * product as rentable that checkout would refuse.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    // Reject non-numeric/garbage quantities explicitly (Number('abc') is
    // NaN, and `stock >= NaN` would silently report unavailable with 200).
    const quantityRaw = Number(searchParams.get('quantity') ?? '1')
    if (!Number.isFinite(quantityRaw) || quantityRaw < 1) {
      return NextResponse.json({ error: 'invalid_quantity' }, { status: 400 })
    }
    const quantity = Math.min(Math.floor(quantityRaw), 1000)

    if (!start || !end) {
      return NextResponse.json({ error: 'invalid_dates' }, { status: 400 })
    }

    const startDate = new Date(start)
    const endDate = new Date(end)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
      return NextResponse.json({ error: 'invalid_dates' }, { status: 400 })
    }

    // findFirst (not findUnique): the lookup filter includes non-unique
    // `isActive`, matching the orders route's phase-1 product check.
    const product = await db.product.findFirst({ where: { id, isActive: true } })
    if (!product) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const bookings = await db.booking.findMany({
      where: {
        productId: id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { quantity: true },
    })

    const bookedQty = bookings.reduce((sum, b) => sum + b.quantity, 0)
    const availableStock = Math.max(0, product.stock - bookedQty)

    return NextResponse.json({
      available: availableStock >= quantity,
      availableStock,
      stock: product.stock,
    })
  } catch (error) {
    console.error('[api/products/availability] GET error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
